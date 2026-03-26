import { db } from "../db";
import { leads, organizations, messages } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { MessageRepository } from "../repositories/message";
import { AgentRepository } from "../repositories/agent";
import { LeadRepository } from "../repositories/lead";
import { WhatsappService } from "./whatsapp";
import { CRMRepository } from "../repositories/crm";

// Gera um gap randômico de 6 a 15 minutos entre disparos
function getRandomGapMs() {
    const minMinutes = 6;
    const maxMinutes = 15;
    const gapMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
    return gapMinutes * 60 * 1000;
}

export const OutreachService = {
    /**
     * Verifica e processa a fila de prospecção.
     */
    processQueue: async () => {
        console.log("📨 [Outreach] Verificando fila de prospecção...");
        
        try {
            // Anti-ban: verificar quando foi o último disparo de QUALQUER lead
            const [lastSent] = await db
                .select({ lastAt: messages.createdAt })
                .from(messages)
                .where(eq(messages.role, "assistant"))
                .orderBy(desc(messages.createdAt))
                .limit(1);

            if (lastSent?.lastAt) {
                const gap = getRandomGapMs();
                const elapsed = Date.now() - new Date(lastSent.lastAt).getTime();
                if (elapsed < gap) {
                    console.log(`⏳ [Outreach] Anti-ban: Last dispatch was ${(elapsed/60000).toFixed(1)}min ago. Gap: ${(gap/60000).toFixed(1)}min. Aguardando...`);
                    return;
                }
            }

            // 1. Buscar um lead que está 'pending'
            const [pendingLead] = await db
                .select()
                .from(leads)
                .where(eq(leads.outreachStatus, "pending"))
                .limit(1);

            if (!pendingLead) {
                return;
            }

            console.log(`📨 [Outreach] Processando lead: ${pendingLead.name} (${pendingLead.phone})`);

            // 2. Buscar organização do lead
            const [org] = await db
                .select()
                .from(organizations)
                .where(eq(organizations.id, pendingLead.organizationId))
                .limit(1);

            if (!org || !org.evolutionInstanceName || org.evolutionInstanceStatus !== "connected") {
                console.warn(`⚠️ [Outreach] Org ${pendingLead.organizationId} não tem WhatsApp conectado. Pulando...`);
                await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "failed" });
                return;
            }

            // 3. Buscar Agente ativo para prospecção
            const agents = await AgentRepository.listByOrgIdSystem(org.id);
            const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];

            if (!agent) {
                console.warn(`⚠️ [Outreach] Nenhum agente encontrado para ${org.id}. Pulando...`);
                await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "failed" });
                return;
            }

            // 4. Montar mensagem inicial personalizada com ScriptService (Tayná)
            const { ScriptService } = await import("./script");
            const messageBody = ScriptService.getInitialMessage();

            // 5. Enviar via WhatsappService
            await WhatsappService.sendText(
                org.id, // organizationId
                pendingLead.phone!,
                messageBody
            );

            // 6. Buscar estágio de atendimento no CRM
            const targetStageId = await CRMRepository.getStageByName(org.id, "Atendimento");

            // 7. Atualizar status, estágio e histórico em uma única transação (ou sequência direta)
            await LeadRepository.updateSystem(pendingLead.id, {
                outreachStatus: "completed",
                lastOutreachAt: new Date(),
                lastContactAt: new Date(),
                status: "CONTACTED",
                conversationState: "WAITING_REPLY", 
                stageId: targetStageId || pendingLead.stageId
            });

            await MessageRepository.createSystem({
                organizationId: org.id,
                leadId: pendingLead.id,
                role: "assistant",
                content: messageBody
            });

            console.log(`✅ [Outreach] Mensagem enviada para ${pendingLead.name} com sucesso!`);

        } catch (error) {
            console.error("❌ [Outreach] Erro crítico ao processar fila:", error);
        }
    }
};
