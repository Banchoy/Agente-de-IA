
import { db } from "@/lib/db";
import { stages, pipelines } from "@/lib/db/schema";
import { eq, and, or, ilike, asc } from "drizzle-orm";


export const CRMRepository = {
    ensureDefaultPipeline: async (organizationId: string) => {
        // Verifica se já existe ao menos um pipeline
        const existing = await db
            .select({ id: pipelines.id })
            .from(pipelines)
            .where(eq(pipelines.organizationId, organizationId))
            .limit(1);
        
        if (existing.length > 0) {
            // Verifica se este pipeline já possui estágios e retorna o PRIMEIRO (conforme 'order')
            const currentStages = await db.select({ id: stages.id, name: stages.name, order: stages.order })
                .from(stages)
                .where(eq(stages.pipelineId, existing[0].id))
                .orderBy(asc(stages.order));
            
            if (currentStages.length > 0) {
                console.log(`🎯 [CRM] Usando estágio existente: ${currentStages[0].name} (ID: ${currentStages[0].id})`);
                return currentStages[0].id;
            }
            
            // Se o pipeline existir mas estiver VAZIO, continuamos para criar os estágios padrão abaixo.
            console.log(`⚠️ [CRM] Pipeline ${existing[0].id} encontrado mas sem estágios. Criando colunas padrão...`);
        }

        // Determina o ID do pipeline (ou o existente ou o novo)
        let pipelineId = existing[0]?.id;
        
        if (!pipelineId) {
            console.log(`🏗️ [CRM] Criando pipeline padrão para a org ${organizationId}...`);
            const [newPipeline] = await db.insert(pipelines).values({
                name: "Pipeline de Vendas",
                organizationId: organizationId
            }).returning();
            pipelineId = newPipeline.id;
        }

        // Cria os estágios padrão
        const defaultStages = [
            { name: "Novo Lead", order: "0" },
            { name: "Em Atendimento (IA)", order: "1" },
            { name: "Qualificação", order: "2" },
            { name: "Perdido", order: "3" }
        ];

        const insertedStages = await db.insert(stages).values(
            defaultStages.map(s => ({
                pipelineId: pipelineId,
                name: s.name,
                order: s.order
            }))
        ).returning();

        console.log(`🎯 [CRM] Stage ID retornado (novo): ${insertedStages[0]?.id || "null"}`);
        return insertedStages[0]?.id || null;
    },

    getStageByName: async (organizationId: string, stageName: string) => {
        // Garante que a estrutura básica exista
        await CRMRepository.ensureDefaultPipeline(organizationId);

        // Encontra o estágio pelo nome (case insensitive)
        const allStages = await db
            .select({ id: stages.id, name: stages.name })
            .from(stages)
            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
            .where(eq(pipelines.organizationId, organizationId));

        const defaultStage = allStages.find(s => s.name.toLowerCase().includes("novo")) || 
                             allStages.find(s => s.name.toLowerCase() === "qualificação") || 
                             allStages.find(s => s.name.toLowerCase().includes("prospect")) || 
                             allStages[0];
        
        return defaultStage?.id || null;
    }
};
