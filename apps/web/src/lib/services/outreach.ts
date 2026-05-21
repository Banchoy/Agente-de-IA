import { db } from "../db";
import { leads, organizations, messages, whatsappSessions } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { MessageRepository } from "../repositories/message";
import { AgentRepository } from "../repositories/agent";
import { LeadRepository } from "../repositories/lead";
import { WhatsappService } from "./whatsapp";
import { CRMRepository } from "../repositories/crm";

// Gera um gap randômico de 6 a 15 minutos entre disparos (Anti-Ban mais agressivo)
function getRandomGapMs() {
    const minMinutes = 6;
    const maxMinutes = 15;
    const gapMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
    return gapMinutes * 60 * 1000;
}

export const OutreachService = {
    /**
     * Tenta recuperar conversas que ficaram pendentes para uma organização específica.
     */
    processRecoveryQueueForOrg: async (organizationId: string) => {
        try {
            // Query para encontrar leads onde a última mensagem é 'user' da organização correspondente
            const pendingResponses = await db.execute(sql`
                SELECT l.id, l.organization_id 
                FROM leads l
                WHERE l.organization_id = ${organizationId}
                AND l.ai_active = 'true'
                AND l.outreach_status != 'pending'
                AND EXISTS (
                    SELECT 1 FROM messages m
                    WHERE m.lead_id = l.id
                    AND m.role = 'user'
                    AND m.created_at = (
                        SELECT MAX(created_at) FROM messages WHERE lead_id = l.id
                    )
                )
                LIMIT 5
            `);

            const rows = Array.isArray(pendingResponses)
                ? pendingResponses
                : (pendingResponses as any)?.rows || [];
            const leadsToRecover = rows as unknown as { id: string, organization_id: string }[];
            if (!leadsToRecover || leadsToRecover.length === 0) return false;

            console.log(`🔄 [Outreach - Org ${organizationId}] Encontrados ${leadsToRecover.length} leads aguardando resposta. Recuperando...`);

            for (const item of leadsToRecover) {
                try {
                    const lead = await LeadRepository.getByIdSystem(item.id);
                    if (!lead) continue;

                    console.log(`🎯 [Outreach - Org ${organizationId}] Recuperando conversa com lead: ${lead.name} (${lead.phone})`);
                    await OutreachService.respondToLead(lead);
                } catch (err) {
                    console.error(`❌ [Outreach - Org ${organizationId}] Erro ao recuperar lead ${item.id}:`, err);
                }
            }
            return true;
        } catch (error) {
            console.error(`❌ [Outreach - Org ${organizationId}] Erro na fila de recuperação:`, error);
            return false;
        }
    },

    /**
     * Gera e envia uma resposta de IA para um lead que ficou pendente.
     */
    respondToLead: async (lead: any) => {
        const { AIService } = await import("./ai");
        const { ScriptService } = await import("./script");

        const agents = await AgentRepository.listByOrgIdSystem(lead.organizationId);
        const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];
        if (!agent) return;

        // Determinar a sessão de WhatsApp ativa do agente
        let sessionId = agent.whatsappInstanceName;
        if (!sessionId) {
            const dbSessions = await db.select({ sessionId: whatsappSessions.sessionId })
                .from(whatsappSessions)
                .where(eq(whatsappSessions.organizationId, lead.organizationId))
                .limit(1);
            if (dbSessions.length > 0) {
                sessionId = dbSessions[0].sessionId;
            }
        }

        if (!sessionId) {
            console.warn(`⚠️ [Outreach - Respond] Nenhuma sessão encontrada para a Org ${lead.organizationId}.`);
            return;
        }

        const history = await (MessageRepository as any).listByLeadSystem(lead.id, 20);
        const formattedHistory = history.reverse().map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            content: m.content || ""
        }));

        const scriptInstruction = ScriptService.getInstruction(lead.conversationState, lead, agent.config);
        
        console.log(`🤖 [Outreach - Org ${lead.organizationId}] Gerando resposta de recuperação para ${lead.name}...`);
        
        const aiResponse = await AIService.generateAdaptiveResponse(
            agent.config,
            lead,
            formattedHistory,
            scriptInstruction
        );

        if (aiResponse && aiResponse.body) {
            // Enviar resposta usando a sessão correta
            const sendResult = await WhatsappService.sendText(sessionId, lead.phone, aiResponse.body);
            
            // Registrar no banco
            await MessageRepository.createSystem({
                organizationId: lead.organizationId,
                leadId: lead.id,
                role: "assistant",
                content: aiResponse.body,
                whatsappMessageId: (sendResult as any)?.key?.id || `recovery_${Date.now()}`
            });

            // Avançar estado se necessário
            const nextState = ScriptService.advanceState(lead.conversationState, lead, aiResponse);
            if (nextState !== lead.conversationState) {
                await LeadRepository.updateSystem(lead.id, { conversationState: nextState });
            }
        }
    },

    /**
     * Verifica e processa a fila de prospecção.
     */
    processQueue: async () => {
        // ⏰ BLOQUEIO DE HORÁRIO COMERCIAL GLOBAL (Não dispara prospecção ativa entre 21h e 08h)
        const hourNow = parseInt(new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: 'numeric',
            hour12: false
        }).format(new Date()));

        if (hourNow >= 21 || hourNow < 8) {
            console.log(`💤 [Outreach] Fora do horário comercial (${hourNow}h). Fila de prospecção pausada.`);
            return;
        }

        try {
            // 1. Buscar todas as organizações registradas no banco
            const orgs = await db.select().from(organizations);
            console.log(`📨 [Outreach] Processando fila de prospecção para ${orgs.length} organizações.`);

            // Executar de forma independente para cada organização
            for (const org of orgs) {
                try {
                    await OutreachService.processQueueForOrg(org.id);
                } catch (orgErr) {
                    console.error(`❌ [Outreach] Erro ao processar organização ${org.id}:`, orgErr);
                }
            }
        } catch (error) {
            console.error("❌ [Outreach] Erro crítico ao buscar organizações:", error);
        }
    },

    /**
     * Processa a fila de prospecção para uma organização específica.
     */
    processQueueForOrg: async (orgId: string) => {
        let pendingLead: any = null;

        try {
            // 1. Buscar se há leads 'pending' para esta organização
            const [result] = await db
                .select()
                .from(leads)
                .where(and(
                    eq(leads.outreachStatus, "pending"),
                    eq(leads.organizationId, orgId)
                ))
                .limit(1);

            pendingLead = result;

            // Se não houver lead pendente, não há trabalho a ser feito para esta org
            if (!pendingLead) {
                return;
            }

            console.log(`📨 [Outreach - Org ${orgId}] Há leads pendentes na fila. Iniciando verificações...`);

            // 2. Buscar Agente ativo para prospecção da organização
            const agents = await AgentRepository.listByOrgIdSystem(orgId);
            const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];

            if (!agent) {
                console.warn(`⚠️ [Outreach - Org ${orgId}] Nenhum agente encontrado. Marcando lead como falha.`);
                await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "failed_no_agent" });
                return;
            }

            // 3. Determinar a sessão de WhatsApp ativa do agente
            let sessionId = agent.whatsappInstanceName;
            if (!sessionId) {
                const dbSessions = await db.select({ sessionId: whatsappSessions.sessionId })
                    .from(whatsappSessions)
                    .where(eq(whatsappSessions.organizationId, orgId))
                    .limit(1);
                if (dbSessions.length > 0) {
                    sessionId = dbSessions[0].sessionId;
                }
            }

            if (!sessionId) {
                console.warn(`⚠️ [Outreach - Org ${orgId}] Nenhuma sessão conectada encontrada. Pulando...`);
                return;
            }

            // 4. Validar se a sessão Baileys está ativa em memória
            const baileysSession = WhatsappService.sessions.get(sessionId);
            if (!baileysSession || baileysSession.status !== "open") {
                console.warn(`⚠️ [Outreach - Org ${orgId}] Sessão Baileys ${sessionId} não está aberta (status: ${baileysSession?.status || 'inexistente'}). Pulando...`);
                return;
            }

            // 5. Anti-ban isolado por organização
            const { redis } = await import("@/lib/redis");
            let lastSentAt: Date | null = null;
            const redisKey = `outreach:last_sent_at:${orgId}`;
            
            if (redis) {
                const cachedLastSent = await redis.get(redisKey);
                if (cachedLastSent) {
                    lastSentAt = new Date(parseInt(cachedLastSent));
                }
            }

            // Fallback para o banco (apenas mensagens desta organização)
            if (!lastSentAt) {
                const [lastSent] = await db
                    .select({ lastAt: messages.createdAt })
                    .from(messages)
                    .where(and(
                        eq(messages.role, "assistant"),
                        eq(messages.organizationId, orgId)
                    ))
                    .orderBy(desc(messages.createdAt))
                    .limit(1);
                
                if (lastSent?.lastAt) {
                    lastSentAt = new Date(lastSent.lastAt);
                    if (redis) await redis.set(redisKey, lastSentAt.getTime().toString(), "EX", 86400);
                }
            }

            if (lastSentAt) {
                const gap = getRandomGapMs();
                const elapsed = Date.now() - lastSentAt.getTime();
                if (elapsed < gap) {
                    console.log(`⏳ [Outreach - Org ${orgId}] Anti-ban: Último disparo foi há ${(elapsed/60000).toFixed(1)}min. Gap: ${(gap/60000).toFixed(1)}min. Aguardando...`);
                    return;
                }
            }

            // 6. Tentar recuperar conversas pendentes específicas da organização primeiro
            const hasRecovered = await OutreachService.processRecoveryQueueForOrg(orgId);
            if (hasRecovered) {
                // Se recuperou alguém, atualiza o anti-ban e encerra a volta atual da org
                if (redis) await redis.set(redisKey, Date.now().toString(), "EX", 86400);
                return;
            }

            // 7. Marcar imediatamente o lead como 'processing' para evitar duplicidade
            await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "processing" });

            console.log(`📨 [Outreach - Org ${orgId}] Processando lead: ${pendingLead.name} (${pendingLead.phone})`);

            // 8. Validação de número ativo
            if (pendingLead.phone) {
                try {
                    const isValid = await WhatsappService.isValidNumber(sessionId, pendingLead.phone);
                    if (!isValid) {
                        console.warn(`🚫 [Outreach - Org ${orgId}] Lead ${pendingLead.name} possui telefone inválido: ${pendingLead.phone}. EXCLUINDO...`);
                        await LeadRepository.deleteSystem(pendingLead.id);
                        return;
                    }
                } catch (validErr) {
                    console.warn(`⚠️ [Outreach - Org ${orgId}] Erro ao validar número ${pendingLead.phone}. Continuando:`, validErr);
                }
            } else if (!pendingLead.email) {
                console.warn(`🚫 [Outreach - Org ${orgId}] Lead ${pendingLead.name} sem formas de contato válidas. EXCLUINDO...`);
                await LeadRepository.deleteSystem(pendingLead.id);
                return;
            }

            // 9. [NOVA TRAVA DE SEGURANÇA] — MEMÓRIA DE DISPARO (apenas histórico recente)
            const recentHistory = await (MessageRepository as any).listByLeadSystem(pendingLead.id, 5);
            const hasRecentTouch = recentHistory.some((m: any) => m.role === "assistant");
            
            if (hasRecentTouch) {
                console.log(`🛡️ [Outreach - Org ${orgId}] Lead ${pendingLead.name} já possui interação recente. Concluindo...`);
                await LeadRepository.updateSystem(pendingLead.id, { 
                    outreachStatus: "completed",
                    status: "CONTACTED"
                });
                return;
            }

            // 10. Montar mensagem inicial personalizada
            const { ScriptService } = await import("./script");
            const messageBody = await ScriptService.getInitialMessage(agent.config || {}, pendingLead);

            // 11. Enviar mensagem usando a sessão do agente
            const sendResult = await WhatsappService.sendText(
                sessionId,
                pendingLead.phone!,
                messageBody
            );

            // 12. Sincronização de JID
            let finalPhone = pendingLead.phone;
            const originalPhone = pendingLead.phone;

            if (sendResult.jid) {
                const jidNumber = sendResult.jid.split("@")[0];
                console.log(`📡 [Outreach - Org ${orgId}] WhatsApp retornou JID: ${sendResult.jid}`);

                if (jidNumber !== pendingLead.phone) {
                    console.log(`🔄 [Outreach - Org ${orgId}] Sincronizando: ${pendingLead.phone} -> ${jidNumber}`);
                    finalPhone = jidNumber;

                    const existingLead = await LeadRepository.getByPhoneSystem(jidNumber, orgId);
                    if (existingLead && existingLead.id !== pendingLead.id) {
                        console.warn(`⚠️ [Outreach - Org ${orgId}] Conflito de JID com lead ${existingLead.id}. Removendo duplicado...`);
                        await LeadRepository.deleteSystem(existingLead.id);
                    }
                }
            }

            const updatedMetadata = {
                ...(pendingLead.metaData as any || {}),
                originalPhone: originalPhone,
                normalizedPhone: finalPhone,
                outreachInstance: sessionId,
                activeCard: "IA",
                outreachJid: sendResult.jid
            };

            // Atualizar anti-ban no Redis
            if (redis) await redis.set(redisKey, Date.now().toString(), "EX", 86400);

            // Buscar estágio de atendimento
            const targetStageId = await CRMRepository.getStageByName(orgId, "Em Atendimento (IA)");

            // Atualizar status do lead
            await LeadRepository.updateSystem(pendingLead.id, {
                phone: finalPhone,
                metaData: updatedMetadata,
                outreachStatus: "completed",
                lastOutreachAt: new Date(),
                status: "CONTACTED",
                conversationState: "1", 
                source: "Outreach",
                stageId: targetStageId || pendingLead.stageId
            });

            // Registrar mensagem no histórico
            await MessageRepository.createSystem({
                organizationId: orgId,
                leadId: pendingLead.id,
                role: "assistant",
                content: messageBody,
                whatsappMessageId: (sendResult as any)?.key?.id || `outreach_${Date.now()}`
            });

            console.log(`✅ [Outreach - Org ${orgId}] Mensagem enviada para ${pendingLead.name}!`);

        } catch (error) {
            console.error(`❌ [Outreach - Org ${orgId}] Erro ao processar fila:`, error);
            if (pendingLead?.id) {
                try {
                    await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "failed_error" });
                } catch (retryErr) {
                    console.error("❌ [Outreach] Erro ao marcar falha no lead:", retryErr);
                }
            }
        }
    }
};
