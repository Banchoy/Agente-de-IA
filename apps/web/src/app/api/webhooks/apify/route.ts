import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, stages, pipelines } from "@saas/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const orgId = url.searchParams.get("orgId");
        
        if (!orgId) {
            return NextResponse.json({ error: "Missing orgId in webhook" }, { status: 400 });
        }

        const payload = await req.json();
        const datasetId = payload.resource?.defaultDatasetId || payload.datasetId;

        if (!datasetId) {
            return NextResponse.json({ error: "No datasetId found" }, { status: 400 });
        }

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
        const allStages = await db.select({ id: stages.id, name: stages.name })
            .from(stages)
            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
            .where(eq(pipelines.organizationId, orgId));

        const defaultStage = allStages.find(s => s.name.toLowerCase() === "qualificação") || 
                             allStages.find(s => s.name.toLowerCase().includes("prospect")) || 
                             allStages.find(s => s.name.toLowerCase().includes("novo")) || 
                             allStages[0];
                             
        const stageId = defaultStage?.id || null;

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
            if (phone) phone = "+" + phone;

            await db.insert(leads).values({
                organizationId: orgId,
                stageId: stageId,
                name: leadName,
                phone: phone,
                email: item.email || item.emails?.[0] || "",
                source: "Apify Maps",
                metaData: {
                    ...item,
                    website: item.website || item.url || ""
                },
                // Em vez de auto-enviar (pending) como no passado, deixamos parado aguardando o Botão Mágico
                outreachStatus: "idle",
                aiActive: "true"
            });
            savedCount++;
        }

        console.log(`✅ [Apify Webhook] Processo de extração salvo! ${savedCount} leads inseridos na fase Qualificação.`);

        return NextResponse.json({ success: true, count: savedCount });
    } catch (error: any) {
        console.error("❌ [Apify Webhook] Ocorreu um erro no processamento:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
