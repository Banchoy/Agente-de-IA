import { db } from "../db";
import { leads } from "../db/schema";
import { eq, and, or, isNull, lt, sql } from "drizzle-orm";
import { EvolutionService } from "./evolution";
import { MessageRepository } from "../repositories/message";
import { AgentRepository } from "../repositories/agent";
import { LeadRepository } from "../repositories/lead";

export const OutreachService = {
    /**
     * Verifica e processa a fila de prospecção.
     * Deve ser chamado periodicamente (por exemplo, a cada 1 minuto).
     */
    processQueue: async () => {
        console.log("📨 [Outreach] Verificando fila de prospecção...");
        
        try {
            // 1. Buscar um lead que está 'pending' e não recebeu mensagem nos últimos 5 minutos
            // (ou nunca recebeu)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            const [pendingLead] = await db
                .select()
                .from(leads)
                .where(
                    and(
                        eq(leads.outreachStatus, "pending"),
                        or(
                            isNull(leads.lastOutreachAt),
                            lt(leads.lastOutreachAt, fiveMinutesAgo)
                        )
                    )
                )
                .limit(1);

            if (!pendingLead) {
                // console.log("📨 [Outreach] Nenhum lead pendente ou em intervalo de segurança.");
                return;
            }

            console.log(`📨 [Outreach] Processando lead: ${pendingLead.name} (${pendingLead.phone})`);

            // 2. Buscar organização do lead
            const [org] = await db
                .select()
                .from(db.query.organizations as any)
                .where(eq((db.query.organizations as any).id, pendingLead.organizationId))
                .limit(1);

            if (!org || !org.evolutionInstanceName || org.evolutionInstanceStatus !== "connected") {
                console.warn(`⚠️ [Outreach] Org ${pendingLead.organizationId} não tem WhatsApp conectado. Pulando...`);
                await LeadRepository.update(pendingLead.id, { outreachStatus: "failed" });
                return;
            }

            // 3. Buscar Agente ativo para prospecção
            const agents = await AgentRepository.listByOrgId(org.id);
            const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];

            if (!agent) {
                console.warn(`⚠️ [Outreach] Nenhum agente encontrado para ${org.id}. Pulando...`);
                await LeadRepository.update(pendingLead.id, { outreachStatus: "failed" });
                return;
            }

            // 4. Montar mensagem inicial personalizada
            // O usuário quer: nicho, nome, endereço, site... (estão no metaData)
            const meta = (pendingLead.metaData as any) || {};
            const firstName = pendingLead.name.split(' ')[0];
            const niche = meta.niche || meta.category || 'seu setor';
            
            // Exemplo de template solicitado: "Olá [nome], vi que você trabalha com [nicho]..."
            let messageBody = `Olá ${firstName}! Tudo bem? 

Vi aqui que você trabalha com ${niche} e gostaria de saber se vocês têm interesse em automatizar o atendimento dos seus leads pelo WhatsApp. 

Vi seu site (${meta.website || meta.url || 'não informado'}) e achei muito interessante o trabalho de vocês. Como está a demanda de atendimento hoje?`;

            // 5. Enviar via Evolution
            await EvolutionService.sendText(
                org.evolutionApiUrl || process.env.EVOLUTION_API_URL || "",
                org.evolutionApiKey || process.env.EVOLUTION_API_KEY || "",
                org.evolutionInstanceName,
                pendingLead.phone!.replace(/\D/g, ""),
                messageBody
            );

            // 6. Atualizar status e salvar no histórico
            await LeadRepository.update(pendingLead.id, {
                outreachStatus: "completed", // Marca como concluído para este lead
                lastOutreachAt: new Date(),
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
