import makeWASocket, { 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    AuthenticationCreds,
    SignalDataTypeMap,
    Browsers
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { db } from "@/lib/db";
import { whatsappSessions, organizations, messages as messagesTable, leads } from "@/lib/db/schema";
import { eq, and, or, isNull, lt, desc, sql, ilike } from "drizzle-orm";
import QRCode from "qrcode";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
import { LeadRepository } from "@/lib/repositories/lead";
import { MessageRepository } from "@/lib/repositories/message";
import { CRMRepository } from "@/lib/repositories/crm";
import { AIService } from "@/lib/services/ai";
import { TTSService } from "@/lib/services/tts";

const logger = pino({ level: "silent" }); // TOTALMENTE SILENCIOSO para o Baileys

// Singleton para persistência em ambiente Next.js (evita múltiplas instâncias em HMR/Reload)
declare global {
    var __baileys_sessions: Map<string, any> | undefined;
    var __baileys_promises: Map<string, Promise<any>> | undefined;
    var __lead_locks: Set<string> | undefined;
    var __processed_messages: Set<string> | undefined;
}
 
const sessions = globalThis.__baileys_sessions || new Map<string, any>();
const connectionPromises = globalThis.__baileys_promises || new Map<string, Promise<any>>();
 
if (process.env.NODE_ENV !== 'production') {
    globalThis.__baileys_sessions = sessions;
    globalThis.__baileys_promises = connectionPromises;
}

/**
 * Função recursiva para converter objetos {type: 'Buffer', data: [...]} de volta para Buffer real.
 */
function fixBuffers(data: any): any {
    if (Array.isArray(data)) {
        return data.map(item => fixBuffers(item));
    }
    if (data && typeof data === 'object') {
        if (data.type === 'Buffer' && Array.isArray(data.data)) {
            return Buffer.from(data.data);
        }
        const newObj: any = {};
        for (const key in data) {
            newObj[key] = fixBuffers(data[key]);
        }
        return newObj;
    }
    return data;
}

/**
 * Custom Drizzle-based Auth State for Baileys
 */
async function useDrizzleAuthState(sessionId: string, organizationId: string) {
    const readData = async (key: string) => {
        const result = await db.query.whatsappSessions.findFirst({
            where: and(
                eq(whatsappSessions.sessionId, sessionId),
                eq(whatsappSessions.key, key)
            )
        });
        return result ? fixBuffers(JSON.parse(result.data)) : null;
    };

    const writeData = async (key: string, data: any) => {
        const dataStr = JSON.stringify(data);
        await db.insert(whatsappSessions)
            .values({
                organizationId,
                sessionId,
                key,
                data: dataStr,
                updatedAt: new Date()
            })
            .onConflictDoUpdate({
                target: [whatsappSessions.sessionId, whatsappSessions.key],
                set: { data: dataStr, updatedAt: new Date() }
            });
    };

    const removeData = async (key: string) => {            // Padronizar sessionId: wa_ + 8 chars do orgId (ou o próprio sessionId se já formatado)
            const cleanSessionId = sessionId.startsWith("wa_") ? sessionId : `wa_${sessionId.slice(0, 8)}`;
            
            await db.delete(whatsappSessions)
                .where(and(
                    eq(whatsappSessions.sessionId, cleanSessionId),
                    eq(whatsappSessions.key, key)
                ));
    };

    const credsData = await readData("creds");
    let creds: AuthenticationCreds = credsData || (await import("@whiskeysockets/baileys")).initAuthCreds();

    return {
        state: {
            creds,
            keys: makeCacheableSignalKeyStore({
                get: async (type, ids) => {
                    const data: { [id: string]: any } = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === "app-state-sync-key" && value) {
                                value = (await import("@whiskeysockets/baileys")).proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    for (const type in data) {
                        for (const id in data[type as keyof SignalDataTypeMap]) {
                            const value = data[type as keyof SignalDataTypeMap]![id];
                            const key = `${type}-${id}`;
                            if (value) {
                                await writeData(key, value);
                            } else {
                                await removeData(key);
                            }
                        }
                    }
                }
            }, logger)
        },
        saveCreds: () => {
            // Log silenciado para economizar memória
            return writeData("creds", creds);
        }
    };
}

export const WhatsappService = {
    sessions: sessions,
    connectionPromises: connectionPromises,

    deleteSessionFromDb: async (sessionId: string) => {
        console.log(`🧹 [Baileys] Iniciando limpeza profunda da sessão ${sessionId}...`);
        try {
            await db.delete(whatsappSessions)
                .where(eq(whatsappSessions.sessionId, sessionId));
            console.log(`✅ [Baileys] Dados da sessão ${sessionId} removidos do banco.`);
        } catch (err) {
            console.error(`❌ [Baileys] Erro ao limpar banco de dados para ${sessionId}:`, err);
        }
    },

    connect: (organizationId: string, sessionId: string) => {
        // LOCK SÍNCRONO IMEDIATO
        if (connectionPromises.has(sessionId)) {
            console.log(`ℹ️ [Baileys] Conexão já em andamento para ${sessionId}, devolvendo promise existente...`);
            return connectionPromises.get(sessionId)!;
        }

        const session = sessions.get(sessionId);
        if (session && (session.status === "open" || session.status === "connecting")) {
            console.log(`ℹ️ [Baileys] Sessão ${sessionId} já ATIVA ou CONECTANDO. Ignorando.`);
            // Trava de segurança para evitar loops ou múltiplas conexões paralelas para o mesmo ID
            if (WhatsappService.sessions.get(sessionId)?.status === "open") {
                console.log(`✅ [Baileys] Sessão ${sessionId} já está OPEN. Ignorando tentativa.`);
                return WhatsappService.sessions.get(sessionId).sock;
            }
            return Promise.resolve(session.sock);
        }

        console.log(`🔌 [Baileys] Iniciando nova conexão definitiva para: ${sessionId}`);
        
        const connectionPromise = (async () => {
            // Validação básica para evitar erros de sintaxe UUID no banco
            if (!organizationId || organizationId.includes('wa_')) {
                console.error(`❌ [Baileys] organizationId inválido detectado: ${organizationId}. Abortando conexão para ${sessionId}`);
                return; // Or throw an error, depending on desired behavior
            }

            try {
                if (WhatsappService.sessions.has(sessionId)) {
                    const existing = WhatsappService.sessions.get(sessionId);
                    if (existing?.sock) {
                        try { existing.sock.logout(); } catch (e) {} // Attempt to log out existing socket
                    }
                    if (existing.status === "open") {
                        console.log(`✅ [Baileys] Sessão ${sessionId} já está ATIVA.`);
                        return existing.sock;
                    }
                }

                // Otimização Render: Aguarda DB estar pronto
                try {
                    console.log("⏳ [Baileys] Verificando conexão com o banco...");
                    await db.execute(sql`SELECT 1`);
                } catch (e) {
                    console.warn("⚠️ [Baileys] Banco ainda não respondeu, aguardando 5s...");
                    await new Promise(r => setTimeout(r, 5000));
                }

                const { state, saveCreds } = await useDrizzleAuthState(sessionId, organizationId);
                const { version } = await fetchLatestBaileysVersion();

                const sock = makeWASocket({
                    version,
                    auth: state,
                    printQRInTerminal: false,
                    logger,
                    browser: ["Android", "Chrome", "20.0.0"],
                    generateHighQualityLinkPreview: true,
                    syncFullHistory: true, // HABILITADO para melhorar sincronização com o celular
                    markOnlineOnConnect: true, // Garante que a sessão apareça como ativa
                    // Sem store local (usando apenas auth state)
                    getMessage: async () => undefined
                });

                // Heartbeat para garantir que o processo está vivo
                const heartbeat = setInterval(() => {
                    const session = WhatsappService.sessions.get(sessionId);
                    if (session && session.status === "open") {
                        // Heartbeat silenciado para evitar ruidoso OOM
                    }
                }, 60000); // 1 minuto
                
                // Armazenar heartbeat na sessão para limpeza
                WhatsappService.sessions.set(sessionId, { sock, qr: null, status: "connecting", heartbeat });

                sock.ev.on("connection.update", async (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    const session = WhatsappService.sessions.get(sessionId);
                    
                    if (qr) {
                        console.log(`📡 [Baileys] QR Code gerado para ${sessionId}`);
                        try {
                            const qrBase64 = await QRCode.toDataURL(qr);
                            if (session) session.qr = qrBase64;
                            
                            // PERSISTÊNCIA NO BANCO (Para cross-process sync)
                            await db.update(organizations)
                                .set({ evolutionQrCode: qrBase64 })
                                .where(eq(organizations.id, organizationId));
                            
                        } catch (err) {
                            console.error("❌ Erro ao gerar/salvar QR Code:", err);
                        }
                    }

                    if (connection) {
                        if (session) session.status = connection;
                        
                        if (connection === "open") {
                            console.log(`✅ [Baileys] Conectado: ${sessionId}`);
                            await db.update(organizations)
                                .set({ 
                                    evolutionInstanceStatus: "connected", 
                                    evolutionInstanceName: sessionId,
                                    evolutionQrCode: null // Limpar QR após conectar
                                })
                                .where(eq(organizations.id, organizationId));
                        } else if (connection === "close") {
                            const error = lastDisconnect?.error as Boom;
                            const statusCode = error?.output?.statusCode;
                            const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                            const shouldReconnect = !isLoggedOut;
                            
                            console.error(`❌ [Baileys] Conexão fechada (${sessionId}). Status: ${statusCode}.`);
                            
                            if (shouldReconnect) {
                                WhatsappService.sessions.delete(sessionId);
                                const delay = 5000 + Math.random() * 10000;
                                console.log(`⏳ [Baileys] Agendando reconexão para ${sessionId} em ${(delay/1000).toFixed(1)}s (jitter)...`);
                                setTimeout(() => WhatsappService.connect(organizationId, sessionId), delay);
                            } else {
                                console.log(`⚠️ [Baileys] Logout detectado. Limpando dados da sessão...`);
                                if (session?.heartbeat) clearInterval(session.heartbeat);
                                await WhatsappService.deleteSessionFromDb(sessionId);
                                WhatsappService.sessions.delete(sessionId);
                                
                                await db.update(organizations)
                                    .set({ 
                                        evolutionInstanceStatus: "disconnected",
                                        evolutionQrCode: null 
                                    })
                                    .where(eq(organizations.id, organizationId));
                            }
                        }
                    }
                });

                sock.ev.on("creds.update", saveCreds);


                // IA and History Handler (Merged and Highly Logged)
                sock.ev.on('messages.upsert', async ({ messages: incomingMessages, type }) => {
                    console.log(`🔍 [Baileys] Entrando no Processamento de Upsert. Tipo: ${type}, Total de mensagens: ${incomingMessages.length}`);
                    
                    if (type !== 'notify' && type !== 'append') {
                        console.log(`⏩ [Baileys] Tipo de upsert ignorado: ${type}`);
                        return;
                    }

                    for (const [index, msg] of incomingMessages.entries()) {
                        console.log(`📩 [Baileys] Analisando mensagem [${index+1}/${incomingMessages.length}]...`);
                        let lead: any = null;
                        try {
                            if (!msg.message) {
                                console.log(`⏩ [Baileys] Mensagem [${index+1}] SEM CONTEÚDO (msg.message is null).`);
                                continue;
                            }

                            const jid = msg.key.remoteJid;
                            if (!jid) {
                                console.log(`⏩ [Baileys] Mensagem [${index+1}] SEM JID remoto.`);
                                continue;
                            }

                            // Permitir tanto o formato clássico (@s.whatsapp.net) quanto o novo (@lid)
                            const isIndividual = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
                            if (!isIndividual) {
                                console.log(`⏩ [Baileys] Mensagem de grupo/status ignorado: ${jid}`);
                                continue;
                            }

                            // Tentar capturar texto de várias formas possíveis
                            const isAudio = !!msg.message.audioMessage;
                            let audioData: any = null;

                            const text = msg.message.conversation || 
                                         msg.message.extendedTextMessage?.text || 
                                         msg.message.imageMessage?.caption ||
                                         msg.message.videoMessage?.caption ||
                                         msg.message.buttonsResponseMessage?.selectedButtonId ||
                                         msg.message.listResponseMessage?.title ||
                                         (isAudio ? "[Áudio]" : "");
                            
                            if (!text && !isAudio) {
                                console.log(`⏩ [Baileys] Mensagem [${index+1}] sem conteúdo útil.`);
                                continue;
                            }

                            // Download audio if present
                            if (isAudio) {
                                console.log(`🎤 [Baileys] Baixando mensagem de áudio...`);
                                try {
                                    const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
                                    const buffer = await downloadMediaMessage(msg, 'buffer', {});
                                    audioData = {
                                        mimeType: msg.message?.audioMessage?.mimetype || "audio/ogg; codecs=opus",
                                        data: buffer.toString('base64')
                                    };
                                    console.log(`🎤 [Baileys] Áudio baixado e convertido para base64. Tamanho: ${audioData.data.length}`);
                                } catch (err) {
                                    console.error(`❌ [Baileys] Erro ao baixar áudio:`, err);
                                }
                            }

                            const phone = jid.split("@")[0];
                            const isFromMe = !!msg.key.fromMe;
                            const role = isFromMe ? "assistant" : "user";

                            console.log(`✨ [Baileys] MENSAGEM VÁLIDA: (${role}) de ${phone}. Texto: "${text.substring(0, 50)}..."`);

                            // 0. Get Organization
                            console.log(`🔍 [Baileys] Buscando organização ID: ${organizationId}`);
                            const org = await OrganizationRepository.getById(organizationId);
                            if (!org) {
                                console.warn(`⚠️ [Baileys] Organização ${organizationId} não encontrada no banco.`);
                                continue;
                            }
                            console.log(`🏢 [Baileys] Org vinculada: ${org.name} (UUID: ${org.id})`);

                            // 1. Find or Create Lead
                            console.log(`👤 [Baileys] Buscando/Criando lead para o telefone: ${phone}`);
                            lead = await (LeadRepository as any).getByPhoneSystem(phone, org.id);
                            
                            if (!lead) {
                                console.log(`👤 [Baileys] Lead novo detectado. Criando...`);
                                // Buscar estágio inicial "Novo Lead"
                                const initialStageId = await CRMRepository.getStageByName(org.id, "Novo Lead");
                                
                                lead = await LeadRepository.createSystem({
                                    organizationId: org.id,
                                    name: phone,
                                    phone: phone,
                                    source: "WhatsApp (Inbound)",
                                    aiActive: "true",
                                    status: "NEW", 
                                    stageId: initialStageId,
                                    outreachStatus: "completed"
                                });
                                console.log(`👤 [Baileys] Lead criado com sucesso: ${lead.id}`);
                            } else {
                                console.log(`👤 [Baileys] Lead existente encontrado: ${lead.id}`);
                            }

                            const whatsappMessageId = msg.key.id;

                            // 2. Save Message to History
                            console.log(`💾 [Baileys] Salvando mensagem no histórico do lead: ${lead.id} (ID: ${whatsappMessageId})`);
                            await (MessageRepository as any).createSystem({
                                organizationId: org.id,
                                leadId: lead.id,
                                role: role,
                                content: text,
                                type: isAudio ? "audio" : "text",
                                whatsappMessageId: whatsappMessageId,
                            });
                            console.log(`✅ [Baileys] Mensagem (${role}) salva no histórico.`);
                            
                            // 3. Comandos de Controle (Pode ser enviado por 'mim' para controlar o lead)
                            const cleanText = text?.toLowerCase().trim();
                            if (cleanText === '/parar ia' || cleanText === '/ativar ia') {
                                const shouldActivate = cleanText === '/ativar ia';
                                console.log(`${shouldActivate ? '✅' : '🚫'} [Baileys] Comando ${cleanText} detectado para o lead ${lead.id}`);
                                
                                await LeadRepository.updateSystem(lead.id, { 
                                    aiActive: shouldActivate ? "true" : "false" 
                                });
                                
                                await sock.sendMessage(jid, { 
                                    text: shouldActivate 
                                        ? "🤖 Atendimento por IA REATIVADO para este contato." 
                                        : "🤖 Atendimento por IA PAUSADO para este contato. (Modo Humano Ativado)" 
                                });
                                continue;
                            }

                            // 4. AI Respond Logic (APENAS para mensagens recebidas)
                            if (isFromMe) continue; 
                            
                            const { redis } = await import("@/lib/redis");
                            
                            if (redis) {
                                // Lock de Lead (5 minutos) - Evita concorrência de processamento
                                const isLocked = await redis.get(`lock:lead:${lead.id}`);
                                if (isLocked) {
                                    console.log(`⏩ [Baileys] Lead ${lead.id} já está sendo processado. Ignorando.`);
                                    continue;
                                }
                                await redis.set(`lock:lead:${lead.id}`, "1", "EX", 300);

                                // Trava de idempotência por mensagem específica (evita notify/append duplicado)
                                if (whatsappMessageId) {
                                    const isProcessed = await redis.get(`processed:msg:${whatsappMessageId}`);
                                    if (isProcessed) {
                                        console.log(`⏩ [Baileys] Mensagem ${whatsappMessageId} já foi processada. Ignorando.`);
                                        await redis.del(`lock:lead:${lead.id}`);
                                        continue;
                                    }
                                    await redis.set(`processed:msg:${whatsappMessageId}`, "1", "EX", 3600); // 1 hora de retenção
                                }
                            }
                            
                            // Trava de idempotência Temporal: Ignorar se enviamos algo nos últimos 10s
                            try {
                                const lastMessages = await (MessageRepository as any).listByLeadSystem(lead.id, 1);
                                const lastAssistantMsg = lastMessages[0];
                                if (lastAssistantMsg && lastAssistantMsg.role === "assistant") {
                                    const diff = Date.now() - new Date(lastAssistantMsg.createdAt).getTime();
                                    if (diff < 10000) {
                                        console.log(`⏩ [Baileys] Lead ${lead.id} recebeu resposta há ${diff}ms. Bloqueando duplicidade.`);
                                        if (redis) await redis.del(`lock:lead:${lead.id}`);
                                        continue;
                                    }
                                }
                            } catch (err) {
                                console.warn("⚠️ [Baileys] Erro ao verificar trava temporal:", err);
                            }

                            // 3. Find Mapped Agent (or fallback)
                            console.log(`🤖 [Baileys] Buscando agente para a instância: ${sessionId}`);
                            let agents = [];
                            try {
                                agents = await AgentRepository.listByOrgIdSystem(org.id);
                            } catch (err) {
                                console.error(`❌ [Baileys] Erro ao buscar agentes:`, err);
                                throw err;
                            }
                            
                            let agent = agents.find(a => (a as any).whatsappInstanceName === sessionId) || agents[0];
                            
                            if (!agent) {
                                console.warn(`⚠️ [Baileys] Nenhum agente disponível para a organização ${org.id}`);
                                throw new Error("No agent available");
                            }

                            console.log(`🤖 [Baileys] Agente: ${agent.name}`);
                            const config = (agent.config as any) || {};

                            if (!config.whatsappResponse) {
                                console.log(`⏩ [Baileys] Resposta automática DESATIVADA para ${agent.name}`);
                                return;
                            }

                            if (lead.aiActive === "false") {
                                console.log(`⏩ [Baileys] IA DESATIVADA para o lead ${lead.name} (Handover).`);
                                return;
                            }

                            if ((agent.config as any).testMode && (agent.config as any).testNumber !== phone) {
                                console.log(`🛡️ [Baileys] Modo de Teste ATIVO. Ignorando número externo: ${phone}`);
                                return;
                            }
                                // ATIVAR DIGITANDO
                                await (LeadRepository as any).updateSystem(lead.id, { isTyping: "true" });

                                // BUSCAR HISTÓRICO PARA MEMÓRIA (Últimas 30 mensagens)
                                const history = await (MessageRepository as any).listByLeadSystem(lead.id, 30);
                                console.log(`💾 [Baileys] Histórico carregado (${history.length} mensagens).`);
                                let formattedHistory = history.reverse().map((m: any) => ({
                                    role: m.role === "assistant" ? "model" : "user",
                                    content: m.content,
                                    media: undefined as any
                                }));

                                // Se a mensagem atual for áudio, anexa os dados ao último item do histórico (que é a mensagem que acabou de ser salva)
                                if (audioData && formattedHistory.length > 0) {
                                    const lastIndex = formattedHistory.length - 1;
                                    if (formattedHistory[lastIndex].role === "user") {
                                        formattedHistory[lastIndex].media = audioData;
                                        console.log(`🎤 [Baileys] Áudio anexado à última mensagem do histórico para processamento.`);
                                    }
                                }

                                // CRÍTICO: O Gemini exige que a primeira mensagem seja do 'user'.
                                // Se o bloco de 10 mensagens começar com uma resposta da IA, removemos para evitar erro.
                                while (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
                                    formattedHistory.shift();
                                }

                                // Se o histórico ficar vazio ou se a mensagem atual não estiver nele, garantimos contexto.
                                if (formattedHistory.length === 0) {
                                    formattedHistory = [{ role: "user", content: text }];
                                }

                                // Delay simulado para leitura: 5 a 10 segundos
                                const leituraDelay = 5000 + Math.random() * 5000;
                                console.log(`⏳ [Baileys] Simulando leitura... Aguardando ${(leituraDelay/1000).toFixed(1)}s.`);
                                await new Promise(resolve => setTimeout(resolve, leituraDelay));

                                // 4. Generate AI Response (Adaptive or Generic)
                                const { ScriptService } = await import("./script");
                                const scriptInstruction = ScriptService.getInstruction(lead.conversationState);
                                
                                console.log(`🤖 [Baileys] Chamando AIService (Adaptativo: ${!!scriptInstruction}) para: ${agent.name}`);

                                const adaptiveResult = await AIService.generateAdaptiveResponse(
                                    config,
                                    lead,
                                    formattedHistory,
                                    scriptInstruction,
                                    config.temperature !== undefined ? parseFloat(config.temperature) : 0.7
                                );

                                const aiResponse = adaptiveResult.body;
                                if (!aiResponse) {
                                    console.log("⏩ [Baileys] IA retornou resposta vazia ou inválida. Ignorando.");
                                    return;
                                }

                                let finalMessage = aiResponse;

                                const leadMeta = (lead.metaData as any) || {};

                                // Update Lead Profile with Learned Info
                                const nextState = ScriptService.advanceState(lead.conversationState);

                                if (adaptiveResult.detectedNiche || adaptiveResult.interestLevel || adaptiveResult.detectedName || nextState !== lead.conversationState) {
                                    const updatedMeta = {
                                        ...leadMeta,
                                        niche: adaptiveResult.detectedNiche || leadMeta.niche,
                                        interestLevel: adaptiveResult.interestLevel || leadMeta.interestLevel,
                                        isDecisor: adaptiveResult.isDecisor !== "unknown" ? adaptiveResult.isDecisor : leadMeta.isDecisor,
                                        detectedName: adaptiveResult.detectedName || leadMeta.detectedName
                                    };
                                    await (LeadRepository as any).updateSystem(lead.id, { 
                                        name: adaptiveResult.detectedName || lead.name,
                                        metaData: updatedMeta,
                                        conversationState: nextState
                                    });
                                }
                                
                                console.log(`🤖 [Baileys] Resposta pronta para envio. Tamanho: ${finalMessage.length} caracteres.`);

                                if (finalMessage) {
                                    // Movimentação automática para 'Em Atendimento (IA)' se for a primeira resposta ou estiver no início
                                    const inServiceStageId = await CRMRepository.getStageByName(lead.organizationId, "Em Atendimento (IA)") || 
                                                            await CRMRepository.getStageByName(lead.organizationId, "Atendimento");
                                    
                                    if (inServiceStageId && lead.stageId !== inServiceStageId) {
                                        console.log(`🚀 [Baileys] Movendo lead ${lead.name} para estágio de atendimento e marcando outreach como concluído.`);
                                        await (LeadRepository as any).updateSystem(lead.id, { 
                                            stageId: inServiceStageId,
                                            outreachStatus: "completed"
                                        });
                                    } else {
                                        // Apenas marca como completed
                                        await (LeadRepository as any).updateSystem(lead.id, { outreachStatus: "completed" });
                                    }

                                    // Detectar qualificação automática
                                    if (finalMessage.includes("[QUALIFICADO]")) {
                                        try {
                                            console.log(`🚀 [Baileys] LEAD QUALIFICADO IDENTIFICADO: ${lead.name}. Buscando estágio no CRM...`);
                                            finalMessage = finalMessage.replace("[QUALIFICADO]", "").trim();
                                            
                                            // Tenta encontrar o ID do estágio 'Qualificação' dinamicamente
                                            const qualificationStageId = await CRMRepository.getStageByName(lead.organizationId, "Qualificação") || 
                                                                         await CRMRepository.getStageByName(lead.organizationId, "Qualification");

                                            if (qualificationStageId) {
                                                console.log(`✅ [Baileys] Estágio encontrado: ${qualificationStageId}. Movendo lead...`);
                                                await (LeadRepository as any).updateSystem(lead.id, { stageId: qualificationStageId });
                                            }
                                        } catch (crmErr) {
                                            console.error("❌ [Baileys] Erro ao mover lead no CRM:", crmErr);
                                        }
                                    }

                                    // 5. Split and Send Message (BREAK, Text and/or Audio)
                                    const audioRegex = /\[(?:AUDIO|ÁUDIO)\]([\s\S]*?)\[\/(?:AUDIO|ÁUDIO)\]/gi;
                                    
                                    // Primeiro, quebra pelo delimitador [MSG_SEP] da IA para fragmentação humanizada
                                    const fragments = finalMessage.split(/\[MSG_SEP\]/i);
                                    const messagesToWait: { type: "text" | "audio", content: string }[] = [];

                                    for (const fragment of fragments) {
                                        let lastIndex = 0;
                                        let match;
                                        const trimmedFragment = fragment.trim();
                                        if (!trimmedFragment) continue;

                                        while ((match = audioRegex.exec(trimmedFragment)) !== null) {
                                            const textBefore = trimmedFragment.substring(lastIndex, match.index).trim();
                                            if (textBefore) messagesToWait.push({ type: "text", content: textBefore });
                                            const audioContent = match[1].trim();
                                            if (audioContent) messagesToWait.push({ type: "audio", content: audioContent });
                                            lastIndex = audioRegex.lastIndex;
                                        }

                                        const remainingText = trimmedFragment.substring(lastIndex).trim();
                                        if (remainingText) messagesToWait.push({ type: "text", content: remainingText });
                                    }

                                    if (messagesToWait.length === 0) {
                                        messagesToWait.push({ type: config.voiceEnabled ? "audio" : "text", content: finalMessage });
                                    }

                                    // Sequential sending
                                    for (const msg of messagesToWait) {
                                        if (msg.type === "audio" && config.voiceEnabled) {
                                            await sock.sendPresenceUpdate('recording', jid);
                                            await new Promise(resolve => setTimeout(resolve, 12000));
                                            
                                            try {
                                                const audioData = await TTSService.generateAudio(msg.content, config.ttsProvider || "openai", config.ttsVoiceId, config.coquiUrl);
                                                const base64 = audioData.split(",")[1];
                                                const buffer = Buffer.from(base64, "base64");
                                                await sock.sendMessage(jid, { audio: buffer, mimetype: "audio/mp4", ptt: true });
                                                // O salvamento agora é feito automaticamente pelo listener global (eco)
                                            } catch (ttsErr) {
                                                await sock.sendMessage(jid, { text: msg.content });
                                                // O salvamento agora é feito automaticamente pelo listener global (eco)
                                            }
                                        } else {
                                            await sock.sendPresenceUpdate('composing', jid);
                                            // Digitando: base de 2s + 50ms por caractere (máx 10s)
                                            const typingDelay = Math.min(2000 + (msg.content.length * 50), 10000);
                                            console.log(`💬 [Baileys] Simulando digitação para "${msg.content.substring(0, 20)}..." por ${(typingDelay/1000).toFixed(1)}s...`);
                                            await new Promise(resolve => setTimeout(resolve, typingDelay));
                                            const cleanText = msg.content.replace(/\[\/?(?:AUDIO|ÁUDIO)\]/gi, "").trim();
                                            if (cleanText) {
                                                await sock.sendMessage(jid, { text: cleanText });
                                                // O salvamento agora é feito automaticamente pelo listener global (eco)

                                                // MOVER LEAD PARA "EM ATENDIMENTO" (Se ainda não estiver)
                                                try {
                                                    const targetStageId = await CRMRepository.getStageByName(lead.organizationId, "Atendimento");
                                                    if (targetStageId && lead.stageId !== targetStageId) {
                                                        console.log(`🚚 [CRM] Movendo lead ${lead.id} para atendimento...`);
                                                        await LeadRepository.updateSystem(lead.id, { stageId: targetStageId });
                                                    }
                                                } catch (crmErr) {
                                                    console.warn(`⚠️ [CRM] Erro ao mover lead para atendimento:`, crmErr);
                                                }
                                            }
                                        }
                                    }
                                }
                            } finally {
                                if (lead?.id) {
                                    const { redis } = await import("@/lib/redis");
                                    await (LeadRepository as any).updateSystem(lead.id, { isTyping: "false" });
                                    if (redis) await redis.del(`lock:lead:${lead.id}`);
                                    console.log(`🔓 [Baileys] Lock LIBERADO para o lead ${lead.id}.`);
                                }
                            }
                    }
                });

                return sock;
            } catch (err) {
                console.error(`❌ [Baileys] Erro no fluxo ${sessionId}:`, err);
                throw err;
            } finally {
                // Remove a promise após um tempo para permitir novas tentativas se a conexão cair depois
                setTimeout(() => {
                    if (connectionPromises.get(sessionId) === connectionPromise) {
                        connectionPromises.delete(sessionId);
                    }
                }, 5000);
            }
        })();

        connectionPromises.set(sessionId, connectionPromise);
        return connectionPromise;
    },

    resumeSessions: async () => {
        console.log("🔄 [Baileys] Resumindo sessões ativas...");
        try {
            const sessionsToResume = await db
                .select({
                    sessionId: whatsappSessions.sessionId,
                    organizationId: whatsappSessions.organizationId,
                })
                .from(whatsappSessions)
                .where(eq(whatsappSessions.key, "creds"))
                .groupBy(whatsappSessions.sessionId, whatsappSessions.organizationId);

            console.log(`📡 [Baileys] Encontradas ${sessionsToResume.length} sessões para restaurar.`);

            for (const { sessionId, organizationId } of sessionsToResume) {
                console.log(`🔌 [Baileys] Restaurando: ${sessionId}...`);
                try {
                    WhatsappService.connect(organizationId, sessionId).catch((err: any) => {
                        console.error(`❌ [Baileys] Falha ao restaurar ${sessionId}:`, err);
                    });
                } catch (err: any) {
                    console.error(`❌ [Baileys] Erro crítico ao disparar restauração de ${sessionId}:`, err);
                }
            }
        } catch (err: any) {
            console.error("❌ [Baileys] Erro ao buscar sessões para resumir:", err);
        }
    },

    sendText: async (organizationId: string, number: string, text: string) => {
        // Padronização robusta do sessionId
        const sessionId = organizationId.startsWith("wa_") ? organizationId : `wa_${organizationId.slice(0, 8)}`;
        console.log(`📤 [Baileys] Tentando enviar mensagem para ${number} via sessão ${sessionId}`);
        
        let session = WhatsappService.sessions.get(sessionId);
        
        // AUTO-RECOVER: Se a sessão não está na memória, tentar restaurar do banco
        if (!session || session.status !== "open" || !session.sock) {
            console.warn(`⚠️ [Baileys] Sessão ${sessionId} não encontrada ou inativa. Tentando auto-recuperação...`);
            
            try {
                // Buscar as credenciais no banco para descobrir o organizationId
                const [sessionRow] = await db
                    .select({ organizationId: whatsappSessions.organizationId })
                    .from(whatsappSessions)
                    .where(and(
                        eq(whatsappSessions.sessionId, sessionId),
                        eq(whatsappSessions.key, "creds")
                    ))
                    .limit(1);
                    
                if (sessionRow) {
                    console.log(`🔄 [Baileys] Credenciais encontradas no banco. Reconectando ${sessionId}...`);
                    await WhatsappService.connect(sessionRow.organizationId, sessionId);
                    
                    // Aguardar até 15 segundos pela conexão ficar pronta
                    for (let i = 0; i < 15; i++) {
                        await new Promise(r => setTimeout(r, 1000));
                        session = WhatsappService.sessions.get(sessionId);
                        if (session?.status === "open" && session?.sock) {
                            console.log(`✅ [Baileys] Auto-recuperação bem-sucedida para ${sessionId}!`);
                            break;
                        }
                    }
                }
            } catch (recoveryErr) {
                console.error(`❌ [Baileys] Falha na auto-recuperação de ${sessionId}:`, recoveryErr);
            }
            
            // Tentar novamente após recuperação
            session = WhatsappService.sessions.get(sessionId);
            if (!session || session.status !== "open" || !session.sock) {
                console.error(`❌ [Baileys] Sessão ${sessionId} não recuperável. Abortando envio.`);
                throw new Error(`Sessão ${sessionId} não encontrada após auto-recuperação.`);
            }
        }

        try {
            const jid = number.includes("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;
            await session.sock.sendMessage(jid, { text });
            console.log(`✅ [Baileys] Mensagem enviada com sucesso para ${number}`);
            return { success: true };
        } catch (err) {
            console.error(`❌ [Baileys] Erro ao enviar mensagem para ${number}:`, err);
            throw err;
        }
    },

    isValidNumber: async (organizationId: string, number: string) => {
        const sessionId = organizationId.startsWith("wa_") ? organizationId : `wa_${organizationId.slice(0, 8)}`;
        let session = WhatsappService.sessions.get(sessionId);

        if (!session || session.status !== "open" || !session.sock) {
             // Tentar auto-recuperação rápida se necessário (similar ao sendText)
             // Para brevidade, assumiremos que o OutreachService garante que a sessão esteja aberta
             // Mas se estiver fechada, retornamos false ou tentamos conectar.
             return false;
        }

        try {
            const cleanNumber = number.replace(/\D/g, "");
            const jid = `${cleanNumber}@s.whatsapp.net`;
            const [result] = await session.sock.onWhatsApp(jid);
            
            if (result && result.exists) {
                console.log(`✅ [Baileys] Número ${number} validado com sucesso (WhatsApp ativo).`);
                return true;
            }
            
            console.warn(`⚠️ [Baileys] Número ${number} NÃO possui WhatsApp ativo.`);
            return false;
        } catch (err) {
            console.error(`❌ [Baileys] Erro ao validar número ${number}:`, err);
            return false;
        }
    }
};
