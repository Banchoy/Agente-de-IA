// @ts-nocheck
import { ScraperService } from "./services/scraper";
import { Redis } from "ioredis";
import { createDb, leads, stages, pipelines } from "@saas/db";
import { eq, and } from "drizzle-orm";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Essential for blpop
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
});
const db = createDb(process.env.DATABASE_URL || "");
const QUEUE_NAME = "scraper_tasks";

async function worker() {
    console.log("🚀 [Scraper Worker] Aguardando tarefas em:", QUEUE_NAME);

    while (true) {
        try {
            // BLPOP (Blocking Left Pop) wait for tasks
            const task = await redis.blpop(QUEUE_NAME, 0);
            if (!task) continue;

            const { url, config, orgId } = JSON.parse(task[1]);
            console.log(`⏳ [Scraper Worker] Processando tarefa para Org: ${orgId}`);

            // Find a valid stage for this Org
            const allStages = await db.select({ id: stages.id, name: stages.name })
                .from(stages)
                .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
                .where(eq(pipelines.organizationId, orgId));

            // Default to "Qualificação" or the first available stage
            const defaultStage = allStages.find(s => s.name.toLowerCase() === "qualificação") || 
                                 allStages.find(s => s.name.toLowerCase().includes("prospect")) || 
                                 allStages.find(s => s.name.toLowerCase().includes("novo")) || 
                                 allStages[0];
            const stageId = defaultStage?.id;

            let savedCount = 0;

            const onLeadExtracted = async (leadData: any) => {
                await db.insert(leads).values({
                    organizationId: orgId,
                    stageId: stageId || null,
                    name: leadData.name,
                    phone: leadData.phone || "",
                    source: "Prospecção IA (Maps)",
                    metaData: {
                        ...leadData,
                        niche: config.niche,
                        initialMessage: config.initialMessage
                    },
                    outreachStatus: "pending",
                    aiActive: "true"
                });
                savedCount++;
                console.log(`✅ [Scraper Worker] Lead salvo: ${leadData.name} (${leadData.phone || 'Sem número'})`);
            };

            const scrapedLeads = await ScraperService.scrapeMaps(url, onLeadExtracted);
            
            console.log(`✅ [Scraper Worker] Tarefa concluída. ${savedCount} leads salvos no banco.`);

        } catch (error) {
            console.error("❌ [Scraper Worker] Erro no loop do worker:", error);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

worker();
