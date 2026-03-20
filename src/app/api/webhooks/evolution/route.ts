import { NextRequest, NextResponse } from "next/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
import { AIService } from "@/lib/services/ai";
import { EvolutionService } from "@/lib/services/evolution";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const event = body.event;
        const data = body.data;
        const instanceName = body.instance;

        console.log(`📩 Webhook recebido: ${event} para instância ${instanceName}`);

        // 1. Sincronização de Status da Conexão
        if (event === "connection.update") {
            const state = data.state; // 'open', 'connecting', 'close', etc.
            console.log(`🔄 Atualizando status da instância ${instanceName} para: ${state}`);
            
            const org = await OrganizationRepository.getByInstanceName(instanceName);
            if (org) {
                await OrganizationRepository.update(org.id, {
                    evolutionInstanceStatus: state === 'open' ? 'connected' : state
                });
            }
            return NextResponse.json({ received: true });
        }

        // 2. Processamento de Mensagens (MESSAGES_UPSERT)
        if (event === "messages.upsert") {
            const message = data.message;
            if (!message || message.key.fromMe) {
                return NextResponse.json({ received: true });
            }

            const remoteJid = message.key.remoteJid;
            const senderNumber = remoteJid.split('@')[0];
            const textContent = message.message?.conversation || message.message?.extendedTextMessage?.text;

            if (!textContent) return NextResponse.json({ received: true });

            // 🚀 PROCESSAMENTO ASSÍNCRONO: Retornamos 200 OK imediatamente para evitar ETIMEDOUT
            // O processamento da IA e o envio da resposta ocorrem em background.
            (async () => {
                try {
                    const org = await OrganizationRepository.getByInstanceName(instanceName);
                    if (!org) return;

                    const agents = await AgentRepository.listByOrgId(org.id);
                    const agent = agents[0];
                    if (!agent) return;

                    const config = (agent.config as any) || {};

                    // Test Mode Filter
                    if (config.testMode && config.testNumber) {
                        if (senderNumber !== config.testNumber) return;
                    }

                    // IA Response
                    const aiResponse = await AIService.generateResponse(
                        config.provider || "google",
                        config.model || "gemini-1.5-flash",
                        config.systemPrompt || "Você é um assistente virtual.",
                        [{ role: "user", content: textContent }]
                    );

                    // Send back
                    await EvolutionService.sendText(
                        org.evolutionApiUrl!,
                        org.evolutionApiKey!,
                        instanceName,
                        senderNumber,
                        aiResponse
                    );
                } catch (err) {
                    console.error("❌ Erro no processamento assíncrono do webhook:", err);
                }
            })();

            return NextResponse.json({ success: true, message: "Processing started" });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
