
import { db } from "@/lib/db";
import { stages, pipelines } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";


export const CRMRepository = {
    ensureDefaultPipeline: async (organizationId: string) => {
        // Verifica se já existe ao menos um pipeline
        const existing = await db
            .select({ id: pipelines.id })
            .from(pipelines)
            .where(eq(pipelines.organizationId, organizationId))
            .limit(1);
        
        if (existing.length > 0) return existing[0].id;

        // Se não houver, cria um padrão
        console.log(`🏗️ [CRM] Criando pipeline padrão para a org ${organizationId}...`);
        const [newPipeline] = await db.insert(pipelines).values({
            name: "Pipeline de Vendas",
            organizationId: organizationId
        }).returning();

        // Cria os estágios padrão
        const defaultStages = [
            { name: "Novo Lead", order: "0" },
            { name: "Em Atendimento (IA)", order: "1" },
            { name: "Qualificação", order: "2" },
            { name: "Perdido", order: "3" }
        ];

        await db.insert(stages).values(
            defaultStages.map(s => ({
                pipelineId: newPipeline.id,
                name: s.name,
                order: s.order
            }))
        );

        return newPipeline.id;
    },

    getStageByName: async (organizationId: string, stageName: string) => {
        // Garante que a estrutura básica exista
        await CRMRepository.ensureDefaultPipeline(organizationId);

        // Encontra o estágio pelo nome (case insensitive)
        const result = await db
            .select({ stageId: stages.id })
            .from(stages)
            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
            .where(
                and(
                    eq(pipelines.organizationId, organizationId),
                    or(
                        ilike(stages.name, stageName),
                        ilike(stages.name, `%${stageName}%`)
                    )
                )
            )
            .limit(1);
        
        return result[0]?.stageId || null;
    }
};
