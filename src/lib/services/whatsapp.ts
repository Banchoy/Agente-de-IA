import makeWASocket, { 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    AuthenticationCreds,
    SignalDataTypeMap
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { db } from "@/lib/db";
import { whatsappSessions, organizations, messages as messagesTable, leads } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
import { LeadRepository } from "@/lib/repositories/lead";
import { MessageRepository } from "@/lib/repositories/message";
import { AIService } from "@/lib/services/ai";

const logger = pino({ level: "silent" });

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

    const removeData = async (key: string) => {
        await db.delete(whatsappSessions)
            .where(and(
                eq(whatsappSessions.sessionId, sessionId),
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
            console.log(`💾 [Baileys] Salvando credenciais para a sessão: ${sessionId}`);
            return writeData("creds", creds);
        }
    };
}

export const WhatsappService = {
    sessions: new Map<string, any>(),
    connectionPromises: new Map<string, Promise<any>>(),

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

    connect: async (organizationId: string, sessionId: string) => {
        // Validação básica para evitar erros de sintaxe UUID no banco
        if (!organizationId || organizationId.includes('wa_')) {
            console.error(`❌ [Baileys] organizationId inválido detectado: ${organizationId}. Abortando conexão para ${sessionId}`);
            return;
        }

        if (WhatsappService.connectionPromises.has(sessionId)) {
            console.log(`ℹ️ [Baileys] Conexão já solicitada para ${sessionId}, aguardando promise...`);
            return WhatsappService.connectionPromises.get(sessionId);
        }

        const connectionPromise = (async () => {
            try {
                if (WhatsappService.sessions.has(sessionId)) {
                    const existing = WhatsappService.sessions.get(sessionId);
                    if (existing.status === "open") {
                        console.log(`✅ [Baileys] Sessão ${sessionId} já está ATIVA.`);
                        return existing.sock;
                    }
                }

                console.log(`🔌 [Baileys] Iniciando nova conexão para: ${sessionId}`);

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
                    browser: ["Agente de IA", "Chrome", "1.0.0"],
                    generateHighQualityLinkPreview: true,
                    // Sem store local (usando apenas auth state)
                    getMessage: async () => undefined
                });

                WhatsappService.sessions.set(sessionId, { sock, qr: null, status: "connecting" });

                // Heartbeat para garantir que o processo está vivo
                const heartbeat = setInterval(() => {
                    const session = WhatsappService.sessions.get(sessionId);
                    if (session && session.status === "open") {
                        console.log(`💓 [Baileys] Heatbeat (Vivo): ${sessionId}`);
                    }
                }, 60000); // 1 minuto

                // Debug: Logar TODOS os eventos do socket (pode ser muito ruidoso, mas ajuda no diagnóstico)
                sock.ev.process(async (events) => {
                    if (events['connection.update']) {
                        const update = events['connection.update']!;
                        // ... handlado abaixo por sock.ev.on ...
                    }
                    if (events['messages.upsert']) {
                        const { messages, type } = events['messages.upsert']!;
                        console.log(`📢 [Baileys] INTERNO - Upsert tipo: ${type}, total: ${messages.length}`);
                    }
                });

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
                            
                            console.error(`❌ [Baileys] Conexão fechada (${sessionId}). Status: ${statusCode}. Erro:`, error || "Erro desconhecido");
                            
                            if (shouldReconnect) {
                                WhatsappService.sessions.delete(sessionId);
                                setTimeout(() => WhatsappService.connect(organizationId, sessionId), 5000);
                            } else {
                                console.log(`⚠️ [Baileys] Logout detectado. Limpando dados da sessão...`);
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
                sock.ev.on("messages.upsert", async ({ messages, type }) => {
                    console.log(`🔍 [Baileys] Entrando no Processamento de Upsert. Tipo: ${type}, Total de mensagens: ${messages.length}`);
                    
                    if (type !== "notify" && type !== "append") {
                        console.log(`⏩ [Baileys] Ignorando upsert tipo ${type}`);
                        return;
                    }

                    for (const [index, msg] of messages.entries()) {
                        console.log(`📩 [Baileys] Analisando mensagem [${index+1}/${messages.length}]...`);
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
                            const text = msg.message.conversation || 
                                         msg.message.extendedTextMessage?.text || 
                                         msg.message.imageMessage?.caption ||
                                         msg.message.videoMessage?.caption ||
                                         msg.message.buttonsResponseMessage?.selectedButtonId ||
                                         msg.message.listResponseMessage?.title ||
                                         "";
                            
                            if (!text) {
                                console.log(`⏩ [Baileys] Mensagem [${index+1}] sem texto útil. Chaves: ${Object.keys(msg.message).join(',')}`);
                                continue;
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
                            let lead = await (LeadRepository as any).getByPhoneSystem(phone, org.id);
                            
                            if (!lead) {
                                console.log(`👤 [Baileys] Lead novo detectado. Criando...`);
                                lead = await (LeadRepository as any).createSystem({
                                    organizationId: org.id,
                                    name: msg.pushName || phone,
                                    phone: phone,
                                    status: "novo",
                                });
                                console.log(`👤 [Baileys] Lead criado com sucesso: ${lead.id}`);
                            } else {
                                console.log(`👤 [Baileys] Lead existente encontrado: ${lead.id}`);
                            }

                            // 2. Save Message to History
                            console.log(`💾 [Baileys] Salvando mensagem no histórico do lead: ${lead.id}`);
                            await (MessageRepository as any).createSystem({
                                organizationId: org.id,
                                leadId: lead.id,
                                role: role,
                                content: text,
                            });
                            console.log(`✅ [Baileys] Mensagem (${role}) salva no histórico.`);

                            // 3. AI Respond Logic (APENAS para mensagens recebidas)
                            if (isFromMe) continue; // Não responde a si mesmo

                            // 3. Find Mapped Agent (or fallback)
                            console.log(`🤖 [Baileys] Buscando agente para a instância: ${sessionId}`);
                            let agents = [];
                            try {
                                agents = await AgentRepository.listByOrgIdSystem(org.id);
                                console.log(`🤖 [Baileys] Agentes encontrados na org: ${agents.length}`);
                            } catch (err) {
                                console.error(`❌ [Baileys] Erro ao buscar agentes no banco:`, err);
                                continue;
                            }
                            
                            // Log de mapeamento para depuração
                            agents.forEach(a => console.log(`   - Agente: ${a.name}, InstanceName no DB: ${(a as any).whatsappInstanceName}`));

                            // Try to find agent with matching instance name
                            let agent = agents.find(a => (a as any).whatsappInstanceName === sessionId);
                            
                            if (!agent) {
                                console.log(`🤖 [Baileys] Nenhum agente mapeado para ${sessionId}. Usando primeiro agente como fallback.`);
                                agent = agents[0];
                            }
                            
                            if (!agent) {
                                console.warn(`⚠️ [Baileys] Nenhum agente TOTALMENTE disponível para a organização ${org.id}`);
                                continue;
                            }

                            console.log(`🤖 [Baileys] Agente SELECIONADO: ${agent.name} (ID: ${agent.id})`);

                            const config = (agent.config as any) || {};
                            console.log(`🤖 [Baileys] Config do Agente:`, JSON.stringify(config));

                            // VERIFICAÇÕES DE RESPOSTA
                            if (!config.whatsappResponse) {
                                console.log(`⏩ [Baileys] Resposta automática DESATIVADA (whatsappResponse: false) para o agente ${agent.name}`);
                                continue;
                            }

                            if (config.testMode) {
                                console.log(`🛡️ [Baileys] Modo de Teste ATIVO. Validando número: ${phone} vs Permitido: ${config.testNumber}`);
                                if (config.testNumber !== phone) {
                                    console.log(`🛡️ [Baileys] Número de teste NÃO corresponde. Ignorando.`);
                                    continue;
                                }
                            }

                            // 4. Generate AI Response
                            console.log(`🤖 [Baileys] Chamando AIService para: ${agent.name}. Provider: ${config.provider || "google"}`);
                            
                            try {
                                // ATIVAR DIGITANDO
                                await (LeadRepository as any).updateSystem(lead.id, { isTyping: "true" });

                                const aiResponse = await AIService.generateResponse(
                                    config.provider || "google",
                                    config.model || "gemini-1.5-flash",
                                    config.systemPrompt || "Você é um assistente virtual.",
                                    [{ role: "user", content: text }]
                                );
                                
                                console.log(`🤖 [Baileys] Resposta da IA recebida. Tamanho: ${aiResponse?.length || 0}`);

                                if (aiResponse) {
                                    // 5. Send Message and Save to DB
                                    await sock.sendMessage(jid, { text: aiResponse });
                                    console.log(`📤 [Baileys] Resposta enviada para ${phone}`);
                                    
                                    await (MessageRepository as any).createSystem({
                                        organizationId: org.id,
                                        leadId: lead.id,
                                        role: "assistant",
                                        content: aiResponse
                                    });
                                }
                            } finally {
                                // DESATIVAR DIGITANDO
                                await (LeadRepository as any).updateSystem(lead.id, { isTyping: "false" });
                            }

                        } catch (err) {
                            console.error("❌ Erro IA/Message Logging Response:", err);
                        }
                    }
                });

                return sock;
            } catch (err) {
                console.error(`❌ [Baileys] Erro no fluxo ${sessionId}:`, err);
                throw err;
            } finally {
                setTimeout(() => {
                    if (WhatsappService.connectionPromises.get(sessionId) === connectionPromise) {
                        WhatsappService.connectionPromises.delete(sessionId);
                    }
                }, 2000);
            }
        })();

        WhatsappService.connectionPromises.set(sessionId, connectionPromise);
        return connectionPromise;
    },

    getSession: (sessionId: string) => {
        return WhatsappService.sessions.get(sessionId);
    },

    resumeSessions: async () => {
        console.log("🔄 [Baileys] Resumindo sessões ativas...");
        try {
            // Get all unique session/org pairs that have credentials
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
                    // Chamamos connect na ordem correta: (organizationId, sessionId)
                    WhatsappService.connect(organizationId, sessionId).catch(err => {
                        console.error(`❌ [Baileys] Falha ao restaurar ${sessionId}:`, err);
                    });
                } catch (err) {
                    console.error(`❌ [Baileys] Erro crítico ao disparar restauração de ${sessionId}:`, err);
                }
            }
        } catch (err) {
            console.error("❌ [Baileys] Erro ao buscar sessões para resumir:", err);
        }
    }
};
