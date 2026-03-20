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
import { whatsappSessions, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
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

                // IA Handler
                sock.ev.on("messages.upsert", async ({ messages, type }) => {
                    if (type !== "notify") return;
                    for (const msg of messages) {
                        if (!msg.message || msg.key.fromMe) continue;
                        const jid = msg.key.remoteJid;
                        if (!jid || !jid.endsWith("@s.whatsapp.net")) continue;

                        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                        if (!text) continue;

                        try {
                            const org = await OrganizationRepository.getById(organizationId);
                            if (!org) continue;
                            const agents = await AgentRepository.listByOrgId(org.id);
                            const agent = agents[0];
                            if (!agent) continue;
                            const config = (agent.config as any) || {};

                            const aiResponse = await AIService.generateResponse(
                                config.provider || "google",
                                config.model || "gemini-1.5-flash",
                                config.systemPrompt || "Você é um assistente virtual.",
                                [{ role: "user", content: text }]
                            );
                            await sock.sendMessage(jid, { text: aiResponse });
                        } catch (err) {
                            console.error("❌ Erro IA Response:", err);
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
    }
};
