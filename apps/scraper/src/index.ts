import { ScraperService } from "./services/scraper";
import Redis from "ioredis";
import { createDb } from "../../../packages/db/src/client";
import { leads, stages, pipelines } from "../../../packages/db/src/schema";
import { eq, and } from "drizzle-orm";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
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

            const scrapedLeads = await ScraperService.scrapeMaps(url);
            
            // Find Qualification Stage for this Org
            const qualificationStage = await db.select({ id: stages.id })
                .from(stages)
                .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
                .where(and(
                    eq(pipelines.organizationId, orgId),
                    eq(stages.name, "Qualificação")
                ))
                .limit(1);

            const stageId = qualificationStage[0]?.id;

            // Save to DB
            for (const leadData of scrapedLeads) {
                await db.insert(leads).values({
                    organizationId: orgId,
                    stageId: stageId,
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
            }

            console.log(`✅ [Scraper Worker] ${scrapedLeads.length} leads salvos no banco.`);

        } catch (error) {
            console.error("❌ [Scraper Worker] Erro no loop do worker:", error);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

worker();
