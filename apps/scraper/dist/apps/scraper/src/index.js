"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const scraper_1 = require("./services/scraper");
const ioredis_1 = require("ioredis");
const db_1 = require("@saas/db");
const drizzle_orm_1 = require("drizzle-orm");
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new ioredis_1.Redis(redisUrl, {
    maxRetriesPerRequest: null, // Essential for blpop
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
});
const db = (0, db_1.createDb)(process.env.DATABASE_URL || "");
const QUEUE_NAME = "scraper_tasks";
async function worker() {
    console.log("🚀 [Scraper Worker] Aguardando tarefas em:", QUEUE_NAME);
    while (true) {
        try {
            // BLPOP (Blocking Left Pop) wait for tasks
            const task = await redis.blpop(QUEUE_NAME, 0);
            if (!task)
                continue;
            const { url, config, orgId } = JSON.parse(task[1]);
            console.log(`⏳ [Scraper Worker] Processando tarefa para Org: ${orgId}`);
            const scrapedLeads = await scraper_1.ScraperService.scrapeMaps(url);
            // Find Qualification Stage for this Org
            const qualificationStage = await db.select({ id: db_1.stages.id })
                .from(db_1.stages)
                .innerJoin(db_1.pipelines, (0, drizzle_orm_1.eq)(db_1.stages.pipelineId, db_1.pipelines.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.pipelines.organizationId, orgId), (0, drizzle_orm_1.eq)(db_1.stages.name, "Qualificação")))
                .limit(1);
            const stageId = qualificationStage[0]?.id;
            // Save to DB
            for (const leadData of scrapedLeads) {
                await db.insert(db_1.leads).values({
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
        }
        catch (error) {
            console.error("❌ [Scraper Worker] Erro no loop do worker:", error);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}
worker();
