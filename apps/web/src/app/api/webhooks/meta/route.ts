
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, metaIntegrations, stages, pipelines } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { MetaService } from "@/lib/services/meta";

/**
 * Endpoint para Webhook do Meta Ads (Leadgen)
 * 
 * GET: Validação do Webhook (Token de Verificação)
 * POST: Recebimento das notificações de novos leads em tempo real
 */

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
        // Buscamos se esse token existe em alguma integração
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

        const entries = body.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field === "leadgen") {
                    const leadgenId = change.value.leadgen_id;
                    const formId = change.value.form_id;

                    console.log(`📥 [Meta Webhook] Novo lead: leadgenId=${leadgenId}, formId=${formId}`);

                    // 1. Buscar integração que possui esse formulário ativo
                    const allIntegrations = await db.select().from(metaIntegrations);
                    
                    const matchedIntegration = allIntegrations.find((integration) => {
                        const forms = (integration.integratedForms as any[]) || [];
                        return forms.some((f: any) => f.formId === formId && f.active);
                    });

                    if (!matchedIntegration) {
                        console.warn(`⚠️ [Meta Webhook] Nenhuma integração ativa para form_id: ${formId}`);
                        continue;
                    }

                    if (!matchedIntegration.accessToken) {
                        console.error(`❌ [Meta Webhook] Token de acesso não encontrado para org: ${matchedIntegration.organizationId}`);
                        continue;
                    }

                    // 2. Buscar detalhes do lead via Graph API
                    try {
                        const leadDetails = await MetaService.getLeadDetails(
                            matchedIntegration.accessToken,
                            leadgenId
                        );

                        // 3. Buscar o primeiro estágio (Novo Lead) do pipeline da organização
                        const firstStage = await db.select({ id: stages.id })
                            .from(stages)
                            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
                            .where(eq(pipelines.organizationId, matchedIntegration.organizationId))
                            .orderBy(asc(stages.order))
                            .limit(1);

                        const stageId = firstStage[0]?.id || null;

                        // 4. Obter nome da página do formulário integrado
                        const forms = (matchedIntegration.integratedForms as any[]) || [];
                        const formEntry = forms.find((f: any) => f.formId === formId);
                        const pageName = formEntry?.pageName || "Facebook";

                        // 5. Inserir lead no banco de dados
                        await db.insert(leads).values({
                            organizationId: matchedIntegration.organizationId,
                            name: leadDetails.name,
                            email: leadDetails.email,
                            phone: leadDetails.phone,
                            source: `Meta: ${pageName}`,
                            status: "active",
                            stageId,
                            createdAt: new Date(leadDetails.createdTime || new Date()),
                            metaData: {
                                facebook_lead_id: leadDetails.id,
                                form_id: formId,
                                ad_id: leadDetails.adId,
                                ad_name: leadDetails.adName,
                                sync_type: "webhook_realtime",
                                received_at: new Date().toISOString(),
                                raw_fields: leadDetails.rawFields,
                            },
                        });

                        console.log(`✅ [Meta Webhook] Lead cadastrado: ${leadDetails.name} (${leadDetails.email || leadDetails.phone || "sem contato"})`);
                    } catch (leadError: any) {
                        console.error(`❌ [Meta Webhook] Erro ao processar lead ${leadgenId}:`, leadError.message);
                        // Não interrompe o loop — continua processando outros leads
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("META_WEBHOOK_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

