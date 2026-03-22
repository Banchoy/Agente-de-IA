
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, metaIntegrations, stages, pipelines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Endpoint para Webhook do Meta Ads (Leadgen)
 * 
 * GET: Validação do Webhook (Token de Verificação)
 * POST: Recebimento das notificações de novos leads
 */

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
        // Buscamos se esse token existe em alguma integração
        // Nota: Em produção, você pode querer um token fixo por organização ou global
        const integration = await db.query.metaIntegrations.findFirst({
            where: eq(metaIntegrations.webhookVerifyToken, token)
        });

        if (integration || token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            return new Response(challenge, { status: 200 });
        }
    }

    return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("META_WEBHOOK_RECEIVED:", JSON.stringify(body, null, 2));

        // Estrutura básica do Leadgen do Meta:
        // entry[0].changes[0].value.leadgen_id
        const entries = body.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field === "leadgen") {
                    const leadgenId = change.value.leadgen_id;
                    const pageId = change.value.page_id;
                    const adId = change.value.ad_id;
                    const formId = change.value.form_id;

                    // TODO: Aqui deveríamos chamar a Meta Graph API para buscar os detalhes do lead usando o leadgenId
                    // Mas por enquanto, vamos apenas registrar a entrada se tivermos a integração configurada via pageId ou similar

                    // Exemplo de fluxo:
                    // 1. Identificar a Organização baseada no pageId (precisaríamos salvar page_id na meta_integrations)
                    // 2. Buscar detalhes do lead (nome, telefone, email) via Meta API
                    // 3. Criar Lead no CRM na coluna "Novo Lead"
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("META_WEBHOOK_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
