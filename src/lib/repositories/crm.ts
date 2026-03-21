
import { db } from "@/lib/db";
import { stages, pipelines } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";

export const CRMRepository = {
    getStageByName: async (organizationId: string, stageName: string) => {
        // Encontra o estágio pelo nome (case insensitive) dentro de qualquer pipeline da organização
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
