import { db } from "../db";
import { leads, organizations } from "../db/schema";
import { eq, and, or, isNull, lt, desc, sql } from "drizzle-orm";
import { EvolutionService } from "./evolution";
import { MessageRepository } from "../repositories/message";
import { AgentRepository } from "../repositories/agent";
import { LeadRepository } from "../repositories/lead";
import { WhatsappService } from "./whatsapp";
import { CRMRepository } from "../repositories/crm";
import { messages } from "../db/schema";

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
     * Deve ser chamado periodicamente (por exemplo, a cada 1 minuto).
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
            const agents = await AgentRepository.listByOrgId(org.id);
            const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];

            if (!agent) {
                console.warn(`⚠️ [Outreach] Nenhum agente encontrado para ${org.id}. Pulando...`);
                await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "failed" });
                return;
            }

            // 4. Montar mensagem inicial personalizada com ScriptService (Bruno)
            const { ScriptService } = await import("./script");
            const messageBody = ScriptService.getInitialMessage();

            // 5. Enviar via WhatsappService (Baileys Interno)
            await WhatsappService.sendText(
                org.evolutionInstanceName,
                pendingLead.phone!.replace(/\D/g, ""),
                messageBody
            );

            // 6. Atualizar status, estado da conversa e salvar no histórico
            const inServiceStageId = await CRMRepository.getStageByName(org.id, "Em Atendimento (IA)") || 
                                    await CRMRepository.getStageByName(org.id, "Atendimento");

            await LeadRepository.updateSystem(pendingLead.id, {
                outreachStatus: "completed",
                lastOutreachAt: new Date(),
                conversationState: "WAITING_REPLY", // Próximo passo quando o cliente responder
                stageId: inServiceStageId || undefined
            });

            await MessageRepository.create({
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
