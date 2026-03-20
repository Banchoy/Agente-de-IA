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
        saveCreds: () => writeData("creds", creds)
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
                });

                WhatsappService.sessions.set(sessionId, { sock, qr: null, status: "connecting" });

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
                            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                            const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                            const shouldReconnect = !isLoggedOut;
                            
                            console.log(`❌ [Baileys] Conexão fechada (${sessionId}). Reason: ${statusCode}. Reconectando: ${shouldReconnect}`);
                            
                            if (shouldReconnect) {
                                WhatsappService.sessions.delete(sessionId);
                                setTimeout(() => WhatsappService.connect(organizationId, sessionId), 5000);
                            } else {
                                console.log(`⚠️ [Baileys] Erro 401/Logout. Limpando...`);
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

                // Logger de eventos genérico para diagnóstico (pode ser removido depois)
                sock.ev.on("messages.upsert", ({ type, messages }) => {
                    console.log(`🔍 [Baileys] Evento upsert: type=${type}, count=${messages.length}`);
                });

                // IA and History Handler
                sock.ev.on("messages.upsert", async ({ messages, type }) => {
                    // Permitimos notify e append para garantir que pegamos mensagens síncronas
                    if (type !== "notify" && type !== "append") return;

                    for (const msg of messages) {
                        try {
                            if (!msg.message) continue;

                            const jid = msg.key.remoteJid;
                            if (!jid || !jid.endsWith("@s.whatsapp.net")) continue;

                            const text = msg.message.conversation || 
                                         msg.message.extendedTextMessage?.text || 
                                         msg.message.imageMessage?.caption ||
                                         "";
                            
                            if (!text) continue;

                            const phone = jid.split("@")[0];
                            const isFromMe = !!msg.key.fromMe;
                            const role = isFromMe ? "assistant" : "user";

                            console.log(`📩 [Baileys] Processando mensagem (${role}) de ${phone}: ${text.substring(0, 50)}...`);

                            // 0. Get Organization
                            const org = await OrganizationRepository.getById(organizationId);
                            if (!org) {
                                console.warn(`⚠️ [Baileys] Organização ${organizationId} não encontrada.`);
                                continue;
                            }

                            // 1. Find or Create Lead
                            let lead = await (LeadRepository as any).getByPhoneSystem(phone, org.id);
                            if (!lead) {
                                console.log(`🆕 [Baileys] Criando novo lead para o número: ${phone}`);
                                lead = await (LeadRepository as any).createSystem({
                                    organizationId: org.id,
                                    name: msg.pushName || phone,
                                    phone: phone,
                                    status: "active",
                                    source: "whatsapp"
                                });
                            }

                            // 2. Save Message to DB (Sempre salvamos para histórico)
                            await (MessageRepository as any).createSystem({
                                organizationId: org.id,
                                leadId: lead.id,
                                role: role,
                                content: text
                            });
                            console.log(`✅ [Baileys] Mensagem (${role}) salva no histórico.`);

                            // 3. AI Respond Logic (APENAS para mensagens recebidas)
                            if (isFromMe) continue; // Não responde a si mesmo

                            // 3. Find Mapped Agent (or fallback)
                            const agents = await AgentRepository.listByOrgIdSystem(org.id);
                            // Try to find agent with matching instance name
                            let agent = agents.find(a => (a as any).whatsappInstanceName === sessionId);
                            if (!agent) agent = agents[0]; // Fallback to first agent
                            
                            if (!agent) {
                                console.warn(`⚠️ [Baileys] Nenhum agente encontrado para a instância ${sessionId}`);
                                continue;
                            }

                            const config = (agent.config as any) || {};

                            // VERIFICAÇÕES DE RESPOSTA
                            if (!config.whatsappResponse) {
                                console.log(`⏩ [Baileys] Resposta automática DESATIVADA para o agente ${agent.name}`);
                                continue;
                            }

                            if (config.testMode && config.testNumber !== phone) {
                                console.log(`🛡️ [Baileys] Modo de Teste ATIVO. Ignorando número externo: ${phone} (Permitido apenas: ${config.testNumber})`);
                                continue;
                            }

                            // 4. Generate AI Response
                            console.log(`🤖 [Baileys] Gerando resposta IA com agente: ${agent.name}...`);
                            const aiResponse = await AIService.generateResponse(
                                config.provider || "google",
                                config.model || "gemini-1.5-flash",
                                config.systemPrompt || "Você é um assistente virtual.",
                                [{ role: "user", content: text }]
                            );

                            if (!aiResponse) {
                                console.warn(`⚠️ [Baileys] IA retornou resposta vazia.`);
                                continue;
                            }

                            // 5. Send Message and Save to DB
                            await sock.sendMessage(jid, { text: aiResponse });
                            console.log(`📤 [Baileys] Resposta enviada para ${phone}`);
                            
                            await (MessageRepository as any).createSystem({
                                organizationId: org.id,
                                leadId: lead.id,
                                role: "assistant",
                                content: aiResponse
                            });

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
