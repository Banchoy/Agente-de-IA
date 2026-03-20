import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    AuthenticationState,
    AuthenticationCreds,
    SignalDataSet,
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
        return result ? JSON.parse(result.data) : null;
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

    let creds: AuthenticationCreds = await readData("creds") || (await import("@whiskeysockets/baileys")).initAuthCreds();

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
                            if (value && typeof value === 'object' && value.type === 'Buffer') {
                                value = Buffer.from(value.data);
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

    connect: async (organizationId: string, sessionId: string) => {
        // Evitar múltiplas conexões para o mesmo sessionId
        if (WhatsappService.sessions.has(sessionId)) {
            const existing = WhatsappService.sessions.get(sessionId);
            if (existing.status === "open") return existing.sock;
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
            if (session) {
                if (qr) {
                    try {
                        const qrBase64 = await QRCode.toDataURL(qr);
                        session.qr = qrBase64;
                    } catch (err) {
                        console.error("❌ Error generating QR Base64:", err);
                        session.qr = null;
                    }
                }
                if (connection) session.status = connection;
            }

            if (qr) {
                console.log(`📡 [Baileys] Novo QR Code gerado para sessão: ${sessionId}`);
            }

            if (connection === "close") {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(`❌ [Baileys] Conexão fechada (${sessionId}). Reconectando: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    setTimeout(() => WhatsappService.connect(organizationId, sessionId), 5000);
                } else {
                    WhatsappService.sessions.delete(sessionId);
                    await db.update(organizations)
                        .set({ evolutionInstanceStatus: "disconnected" })
                        .where(eq(organizations.id, organizationId));
                }
            } else if (connection === "open") {
                console.log(`✅ [Baileys] Conexão aberta com sucesso: ${sessionId}`);
                await db.update(organizations)
                    .set({ evolutionInstanceStatus: "connected", evolutionInstanceName: sessionId })
                    .where(eq(organizations.id, organizationId));
            }
        });

        sock.ev.on("creds.update", saveCreds);

        // Handler de mensagens (IA)
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify") return;
            
            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;
                
                const jid = msg.key.remoteJid;
                if (!jid) continue;

                const textContent = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (!textContent) continue;

                console.log(`📩 [Baileys] Mensagem de ${jid}: ${textContent}`);

                try {
                    const org = await OrganizationRepository.getById(organizationId);
                    if (!org) {
                        console.error(`❌ [Baileys] Organização ${organizationId} não encontrada.`);
                        continue;
                    }

                    const agents = await AgentRepository.listByOrgId(org.id);
                    const agent = agents[0];
                    if (!agent) continue;

                    const config = (agent.config as any) || {};
                    const senderNumber = jid.split('@')[0];

                    // Test Mode Filter
                    if (config.testMode && config.testNumber) {
                        if (senderNumber !== config.testNumber) continue;
                    }

                    // IA Response
                    const aiResponse = await AIService.generateResponse(
                        config.provider || "google",
                        config.model || "gemini-1.5-flash",
                        config.systemPrompt || "Você é um assistente virtual.",
                        [{ role: "user", content: textContent }]
                    );

                    // Send back via Baileys
                    await sock.sendMessage(jid, { text: aiResponse });
                    console.log(`🚀 [Baileys] Resposta enviada para ${jid}`);
                } catch (err) {
                    console.error("❌ [Baileys] Erro ao processar IA ou enviar mensagem:", err);
                }
            }
        });

        return sock;
    },

    getSession: (sessionId: string) => {
        return WhatsappService.sessions.get(sessionId);
    }
};
