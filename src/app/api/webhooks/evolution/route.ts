
import { NextRequest, NextResponse } from "next/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
import { AIService } from "@/lib/services/ai";
import { EvolutionService } from "@/lib/services/evolution";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("📩 Webhook Evolution recebido:", JSON.stringify(body, null, 2));

        const { event, instance, data } = body;

        // Apenas processamos mensagens recebidas (não enviadas por nós)
        if (event !== "messages.upsert") {
            return NextResponse.json({ received: true });
        }

        const message = data.message;
        const key = data.key;

        if (!message || key.fromMe) {
            return NextResponse.json({ received: true });
        }

        const remoteJid = key.remoteJid;
        if (!remoteJid || !remoteJid.endsWith("@s.whatsapp.net")) {
            // Ignorar grupos ou status
            return NextResponse.json({ received: true });
        }

        const text = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption;
        if (!text) {
            return NextResponse.json({ received: true });
        }

        // 1. Identificar a Organização pela instância
        const org = await OrganizationRepository.getByInstanceName(instance);
        if (!org) {
            console.warn(`⚠️ Organização não encontrada para instância: ${instance}`);
            return NextResponse.json({ error: "Org not found" }, { status: 404 });
        }

        // 2. Buscar Agente ativo para WhatsApp
        const agents = await AgentRepository.listByOrgId(org.id);
        const whatsappAgent = agents.find((a: any) => a.config?.whatsappResponse === true);

        if (!whatsappAgent) {
            console.log(`ℹ️ Nenhum agente configurado para responder no WhatsApp na org: ${org.name}`);
            return NextResponse.json({ received: true });
        }

        const config = (whatsappAgent.config as any) || {};

        // 3. Verificar Modo de Teste
        if (config.testMode && config.testNumber) {
            const cleanRemote = remoteJid.replace(/\D/g, "");
            const cleanTest = config.testNumber.replace(/\D/g, "");
            if (cleanRemote !== cleanTest) {
                console.log(`🚫 Modo de Teste ativo. Ignorando mensagem de ${cleanRemote} (Esperado: ${cleanTest})`);
                return NextResponse.json({ received: true });
            }
        }

        // 4. Gerar resposta com IA
        console.log(`🤖 Agente "${whatsappAgent.name}" processando mensagem...`);
        const aiResponse = await AIService.generateResponse(
            config.provider || "google",
            config.model || "gemini-1.5-flash",
            config.systemPrompt || "Você é um assistente útil.",
            [{ role: "user", content: text }],
            config.temperature || 0.7
        );

        // 5. Enviar resposta via Evolution API
        console.log(`📤 Enviando resposta para ${remoteJid}`);
        await EvolutionService.sendText(
            org.evolutionApiUrl || process.env.EVOLUTION_API_URL || "",
            org.evolutionApiKey || process.env.EVOLUTION_API_KEY || "",
            instance,
            remoteJid.split("@")[0], // Evolution espera apenas o número ou JID completo? Normalmente o número.
            aiResponse
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ Erro no Webhook Evolution:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
