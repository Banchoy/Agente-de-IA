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
 * Necessário para que o Baileys reconheça as chaves binárias salvas no banco.
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

    deleteSessionFromDb: async (sessionId: string) => {
        console.log(`🧹 [Baileys] Limpando dados da sessão ${sessionId} do banco de dados...`);
        await db.delete(whatsappSessions)
            .where(eq(whatsappSessions.sessionId, sessionId));
    },

    connect: async (organizationId: string, sessionId: string) => {
        // Idempotência: Evitar múltiplas conexões simultâneas
        if (WhatsappService.sessions.has(sessionId)) {
            const existing = WhatsappService.sessions.get(sessionId);
            if (existing.status === "open" || existing.status === "connecting") {
                console.log(`ℹ️ [Baileys] Já existe uma conexão em andamento para ${sessionId} (${existing.status})`);
                return existing.sock;
            }
        }

        console.log(`🔌 [Baileys] Solicitando conexão para: ${sessionId}`);
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
            if (session) {
                if (qr) {
                    try {
                        const qrBase64 = await QRCode.toDataURL(qr);
                        session.qr = qrBase64;
                    } catch (err) {
                        console.error("❌ Erro ao gerar QR Base64:", err);
                    }
                }
                if (connection) session.status = connection;
            }

            if (qr) {
                console.log(`📡 [Baileys] Novo QR Code gerado para sessão: ${sessionId}`);
            }

            if (connection === "close") {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                // Reason 401 é Logout/Token inválido
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                const shouldReconnect = !isLoggedOut;
                
                console.log(`❌ [Baileys] Conexão fechada (${sessionId}). Reason: ${statusCode}. Reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    WhatsappService.sessions.delete(sessionId);
                    setTimeout(() => WhatsappService.connect(organizationId, sessionId), 5000);
                } else {
                    console.log(`⚠️ [Baileys] Sessão ${sessionId} corrompida ou deslogada (401). Limpando...`);
                    await WhatsappService.deleteSessionFromDb(sessionId);
                    WhatsappService.sessions.delete(sessionId);
                    
                    await db.update(organizations)
                        .set({ evolutionInstanceStatus: "disconnected" })
                        .where(eq(organizations.id, organizationId));
                }
            } else if (connection === "open") {
                console.log(`✅ [Baileys] Conexão ativa: ${sessionId}`);
                await db.update(organizations)
                    .set({ 
                        evolutionInstanceStatus: "connected", 
                        evolutionInstanceName: sessionId 
                    })
                    .where(eq(organizations.id, organizationId));
            }
        });

        sock.ev.on("creds.update", saveCreds);

        // Handler de mensagens da IA
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;
            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;
                const jid = msg.key.remoteJid;
                if (!jid) continue;

                const textContent = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (!textContent) continue;

                try {
                    const org = await OrganizationRepository.getById(organizationId);
                    if (!org) continue;

                    const agents = await AgentRepository.listByOrgId(org.id);
                    const agent = agents[0];
                    if (!agent) continue;

                    const config = (agent.config as any) || {};
                    if (config.testMode && config.testNumber && jid.split('@')[0] !== config.testNumber) continue;

                    const aiResponse = await AIService.generateResponse(
                        config.provider || "google",
                        config.model || "gemini-1.5-flash",
                        config.systemPrompt || "Você é um assistente virtual.",
                        [{ role: "user", content: textContent }]
                    );

                    await sock.sendMessage(jid, { text: aiResponse });
                } catch (err) {
                    console.error("❌ Error IA Response:", err);
                }
            }
        });

        return sock;
    },

    getSession: (sessionId: string) => {
        return WhatsappService.sessions.get(sessionId);
    }
};
