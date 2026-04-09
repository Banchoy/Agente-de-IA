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
    const minMinutes = 4;
    const maxMinutes = 10;
    const gapMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
    return gapMinutes * 60 * 1000;
}

export const OutreachService = {
    /**
     * Verifica e processa a fila de prospecção.
     */
    processQueue: async () => {
        // ⏰ BLOQUEIO DE HORÁRIO
        const hourNow = parseInt(new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: 'numeric',
            hour12: false
        }).format(new Date()));

        // Regras do Usuário: 5h-12h (Bom dia), 12h-17h (Boa tarde), 17h+ (Boa noite)
        const timeGreeting = (hourNow >= 5 && hourNow < 12) ? "bom dia" : (hourNow >= 12 && hourNow < 17) ? "boa tarde" : "boa noite";

        // Não dispara prospecção ativa entre 21h e 08h
        if (hourNow >= 21 || hourNow < 8) {
            console.log(`💤 [Outreach] Fora do horário comercial (${hourNow}h). Fila pausada para evitar inconveniência.`);
            return;
        }

        let pendingLead: any = null;
        
        try {
            // Anti-ban: verificar quando foi o último disparo de QUALQUER lead via Redis
            const { redis } = await import("@/lib/redis");
            let lastSentAt: Date | null = null;
            
            if (redis) {
                const cachedLastSent = await redis.get("outreach:last_sent_at");
                if (cachedLastSent) {
                    lastSentAt = new Date(parseInt(cachedLastSent));
                }
            }

            // Fallback para o banco se o Redis não tiver a info ou estiver desativado
            if (!lastSentAt) {
                const [lastSent] = await db
                    .select({ lastAt: messages.createdAt })
                    .from(messages)
                    .where(eq(messages.role, "assistant"))
                    .orderBy(desc(messages.createdAt))
                    .limit(1);
                
                if (lastSent?.lastAt) {
                    lastSentAt = new Date(lastSent.lastAt);
                    // Popula o cache para a próxima vez
                    if (redis) await redis.set("outreach:last_sent_at", lastSentAt.getTime().toString(), "EX", 86400);
                }
            }

            if (lastSentAt) {
                const gap = getRandomGapMs();
                const elapsed = Date.now() - lastSentAt.getTime();
                if (elapsed < gap) {
                    console.log(`⏳ [Outreach] Anti-ban: Last dispatch was ${(elapsed/60000).toFixed(1)}min ago. Gap: ${(gap/60000).toFixed(1)}min. Aguardando...`);
                    return;
                }
            }

            // 1. Buscar um lead que está 'pending'
            const [result] = await db
                .select()
                .from(leads)
                .where(eq(leads.outreachStatus, "pending"))
                .limit(1);

            pendingLead = result;

            if (!pendingLead) {
                return;
            }

            // 1.1 Marcar imediatamente como 'processing' para evitar duplicidade em execuções paralelas ou próximas
            await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "processing" });

            console.log(`📨 [Outreach] Processando lead: ${pendingLead.name} (${pendingLead.phone})`);

            // 2. Buscar organização do lead
            const [org] = await db
                .select()
                .from(organizations)
                .where(eq(organizations.id, pendingLead.organizationId))
                .limit(1);

            // 🔌 VALIDAÇÃO DE SESSÃO BAILEYS (substitui evolutionInstanceStatus que não é mais atualizado)
            const sessionId = `wa_${org.id.slice(0, 8)}`;
            const baileysSession = WhatsappService.sessions.get(sessionId);
            if (!baileysSession || baileysSession.status !== "open") {
                console.warn(`⚠️ [Outreach] Sessão Baileys ${sessionId} não está aberta (status: ${baileysSession?.status || 'inexistente'}). Pulando...`);
                await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "pending" }); // volta pra fila
                return;
            }

            // 🆕 VALIDAÇÃO DE NÚMERO (Anti-bloqueio e Assertividade)
            if (pendingLead.phone) {
                try {
                    const isValid = await WhatsappService.isValidNumber(org.id, pendingLead.phone);
                    if (!isValid) {
                        console.warn(`🚫 [Outreach] Lead ${pendingLead.name} possui telefone inválido: ${pendingLead.phone}. EXCLUINDO permanentemente...`);
                        await LeadRepository.deleteSystem(pendingLead.id);
                        return;
                    }
                } catch (validErr) {
                    console.warn(`⚠️ [Outreach] Erro ao validar número ${pendingLead.phone}. Continuando sem validação:`, validErr);
                }
            } else if (!pendingLead.email) {
                console.warn(`🚫 [Outreach] Lead ${pendingLead.name} sem formas de contato válidas. EXCLUINDO...`);
                await LeadRepository.deleteSystem(pendingLead.id);
                return;
            }


            // 3. Buscar Agente ativo para prospecção
            const agents = await AgentRepository.listByOrgIdSystem(org.id);
            const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];

            if (!agent) {
                console.warn(`⚠️ [Outreach] Nenhum agente encontrado para ${org.id}. Pulando...`);
                await LeadRepository.updateSystem(pendingLead.id, { outreachStatus: "failed_no_agent" });
                return;
            }

            // 4. Montar mensagem inicial personalizada com ScriptService (Tayná)
            const { ScriptService } = await import("./script");
            const messageBody = await ScriptService.getInitialMessage(agent.config || {}, pendingLead);

            // 5. Enviar via WhatsappService e capturar o JID real (normalizado pelo WhatsApp)
            const sendResult = await WhatsappService.sendText(
                org.id, // organizationId
                pendingLead.phone!,
                messageBody
            );

            // 5.1 Sincronização Crítica: Se o WhatsApp normalizou o JID (ex: removeu o 9º dígito), 
            // atualizamos o lead no banco para que as respostas futuras casem com este ID.
            let finalPhone = pendingLead.phone;
            const originalPhone = pendingLead.phone;

            if (sendResult.jid) {
                const jidNumber = sendResult.jid.split("@")[0];
                console.log(`📡 [Outreach] WhatsApp retornou JID: ${sendResult.jid} para o lead ${pendingLead.id}`);

                if (jidNumber !== pendingLead.phone) {
                    console.log(`🔄 [Outreach] Sincronização Necessária: ${pendingLead.phone} -> ${jidNumber}`);
                    finalPhone = jidNumber;

                    // 🛡️ DEDUPLICAÇÃO RESILIENTE: Verificar se já existe OUTRO lead com o número normalizado
                    const existingLead = await LeadRepository.getByPhoneSystem(jidNumber, org.id);
                    if (existingLead && existingLead.id !== pendingLead.id) {
                        console.warn(`⚠️ [Outreach] CONFLITO DE JID: Outro lead já possui esse identificador (ID: ${existingLead.id}, Nome: ${existingLead.name}).`);
                        
                        // Lógica: Se o existente tem mensagens, devemos manter o existente?
                        // Por simplicidade atual, deletamos o "vazio" se for o caso.
                        // Mas aqui apenas logamos por enquanto para entender o padrão.
                        console.log(`🗑️ [Outreach] Removendo lead conflitante para prevalecer o atual prospecção...`);
                        await LeadRepository.deleteSystem(existingLead.id);
                    }
                }
            }

            const updatedMetadata = {
                ...(pendingLead.metaData as any || {}),
                originalPhone: originalPhone,
                normalizedPhone: finalPhone,
                outreachInstance: org.evolutionInstanceName,
                activeCard: "IA",
                outreachJid: sendResult.jid
            };

            // Atualiza o anti-ban no Redis
            if (redis) await redis.set("outreach:last_sent_at", Date.now().toString(), "EX", 86400);

            // 6. Buscar estágio de atendimento no CRM
            const targetStageId = await CRMRepository.getStageByName(org.id, "Em Atendimento (IA)");

            // 7. Atualizar status, estágio, telefone (se mudou) e histórico
            await LeadRepository.updateSystem(pendingLead.id, {
                phone: finalPhone,
                metaData: updatedMetadata,
                outreachStatus: "completed",
                lastOutreachAt: new Date(),
                status: "CONTACTED",
                conversationState: "1", 
                source: "Outreach", // MARCAÇÃO CRÍTICA PARA SEPARAÇÃO DE SCRIPTS
                stageId: targetStageId || pendingLead.stageId
            });

            // 8. Registrar explicitamente a primeira mensagem no histórico
            // Já que o webhook ignora mensagens enviadas pelo próprio bot (fromMe: true)
            await MessageRepository.createSystem({
                organizationId: org.id,
                leadId: pendingLead.id,
                role: "assistant",
                content: messageBody,
                whatsappMessageId: (sendResult as any)?.key?.id || `outreach_${Date.now()}`
            });


            console.log(`✅ [Outreach] Mensagem enviada para ${pendingLead.name} com sucesso!`);

        } catch (error) {
            console.error("❌ [Outreach] Erro crítico ao processar fila:", error);
            // Se houver um lead sendo processado, marcar como falha para não travar a fila
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
