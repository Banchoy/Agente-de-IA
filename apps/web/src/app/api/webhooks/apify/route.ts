import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, pipelines } from "@saas/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const orgId = url.searchParams.get("orgId");
        
        console.log(`📡 [Apify Webhook] Recebendo chamada para Org ${orgId}...`);
        
        if (!orgId) {
            console.error("❌ [Apify Webhook] Chamada sem orgId!");
            return NextResponse.json({ error: "Missing orgId in webhook" }, { status: 400 });
        }

        const payload = await req.json();
        console.log(`📦 [Apify Webhook] Payload bruto:`, JSON.stringify(payload));
        const datasetId = payload.resource?.defaultDatasetId || payload.datasetId;

        if (!datasetId) {
            return NextResponse.json({ error: "No datasetId found" }, { status: 400 });
        }

        const customData = payload.customData || {};
        const fallbackNiche = url.searchParams.get("niche") || "";
        const configNiche = fallbackNiche || customData.config?.niche;

        console.log(`📥 [Apify Webhook] Extração concluída para Org ${orgId}. Buscando dataset ${datasetId}...`);

        // Busca o dataset no Apify
        const apifyToken = process.env.APIFY_API_TOKEN;
        const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`);
        
        if (!datasetResponse.ok) {
            console.error(`❌ Erro ao buscar itens do Apify Dataset: ${datasetResponse.status}`);
            return NextResponse.json({ error: "Failed to fetch dataset items" }, { status: 500 });
        }

        const items = await datasetResponse.json();
        
        // Identifica o Stage ID apropriado (Colocamos no primeiro ou Qualificação)
        let allStages = await db.select({ id: stages.id, name: stages.name })
            .from(stages)
            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
            .where(eq(pipelines.organizationId, orgId));

        // AUTO-PROVISIONAMENTO: Se não houver estágios, cria um pipeline padrão e o estágio Qualificação
        if (allStages.length === 0) {
            console.log(`🏗️ [Apify Webhook] Org ${orgId} sem CRM configurado. Criando estrutura padrão...`);
            const [newPipeline] = await db.insert(pipelines).values({
                organizationId: orgId,
                name: "Vendas Principal",
                description: "Pipeline criado automaticamente via Apify"
            }).returning();

            const [newStage] = await db.insert(stages).values({
                pipelineId: newPipeline.id,
                name: "Qualificação",
                order: "0"
            }).returning();

            allStages = [{ id: newStage.id, name: newStage.name }];
        }

        const defaultStage = allStages.find(s => s.name.toLowerCase() === "qualificação") || 
                             allStages.find(s => s.name.toLowerCase().includes("prospect")) || 
                             allStages.find(s => s.name.toLowerCase().includes("novo")) || 
                             allStages[0];
                                     
        const stageId = defaultStage?.id || null;
        console.log(`🎯 [Apify Webhook] Usando Stage ID: ${stageId} (${defaultStage?.name || "Nenhum"})`);

        let savedCount = 0;
        
        // Formata os dados no padrão do banco
        for (const item of items) {
            if (!item.title && !item.name) continue;

            const leadName = item.title || item.name || "Sem Nome Apify";
            // Normalizar telefone para o padrão
            let phone = item.phoneUnformatted || item.phone || item.phoneNumber || "";
            phone = phone.replace(/\D/g, "");
            
            // Adicionar +55 se for BR e tiver 10 ou 11 digitos, caso não tenha DDI.
            if (phone.length === 10 || phone.length === 11) {
                if (!phone.startsWith("55")) phone = "55" + phone;
            }
            if (phone && !phone.startsWith("+")) phone = "+" + phone;

            const email = item.email || item.emails?.[0] || item.contactEmails?.[0] || "";

            // Se não tiver nem telefone nem e-mail, nós ignoramos o lead
            if (!phone && !email) continue;

            try {
                const leadValues = {
                    organizationId: orgId,
                    stageId: stageId,
                    name: leadName,
                    phone: phone,
                    email: email,
                    source: "Apify Maps",
                    metaData: {
                        ...item,
                        website: item.website || item.url || "",
                        niche: configNiche || ""
                    },
                    outreachStatus: "idle",
                    aiActive: "true"
                };

                if (phone) {
                    // UPSERT: Evitar duplicidade por telefone na mesma organização
                    await db.insert(leads)
                        .values(leadValues)
                        .onConflictDoNothing({
                            target: [leads.phone, leads.organizationId]
                        });
                } else {
                    // Sem telefone (apenas e-mail), insere diretamente
                    await db.insert(leads).values(leadValues);
                }
                savedCount++;
            } catch (err) {
                console.error(`❌ Erro ao inserir/atualizar lead ${phone}:`, err);
            }
        }

        console.log(`✅ [Apify Webhook] Processo de extração salvo! ${savedCount} leads inseridos na fase Qualificação.`);

        return NextResponse.json({ success: true, count: savedCount });
    } catch (error: any) {
        console.error("❌ [Apify Webhook] Ocorreu um erro no processamento:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
