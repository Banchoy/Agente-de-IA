import { db } from "../db";
import { leads, messages } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { LeadRepository } from "../repositories/lead";
import { MessageRepository } from "../repositories/message";
import { AIService } from "./ai";
import { WhatsappService } from "./whatsapp";
import { AgentRepository } from "../repositories/agent";

export const PauseService = {
    /**
     * Verifica leads pausados cuja data de retomada já passou e reinicia o atendimento.
     */
    processResumptions: async () => {
        try {
            const now = new Date().toISOString();

            // 1. Buscar leads pausados com expiração vencida
            // Filtramos leads onde aiPaused é 'true' e nextActionAt <= agora
            const expiredLeads = await db.query.leads.findMany({
                where: sql`meta_data->>'aiPaused' = 'true' AND meta_data->>'nextActionAt' <= ${now}`
            });

            if (expiredLeads.length === 0) return;

            console.log(`⏳ [PauseService] Retomando ${expiredLeads.length} leads pausados...`);

            for (const lead of expiredLeads) {
                try {
                    const metadata = (lead.metaData as any) || {};
                    
                    // 2. Unpause Lead
                    const updatedMetadata = { 
                        ...metadata, 
                        aiPaused: "false", 
                        activeCard: "IA" 
                    };
                    delete updatedMetadata.nextActionAt;

                    await LeadRepository.updateSystem(lead.id, {
                        aiActive: "true",
                        metaData: updatedMetadata
                    });

                    // 3. Gerar Mensagem de Retomada (Remind)
                    const agents = await AgentRepository.listByOrgIdSystem(lead.organizationId);
                    const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];
                    
                    if (!agent) continue;

                    const history = await MessageRepository.listByLeadSystem(lead.id, 5);
                    const formattedHistory = history.reverse().map(m => ({
                        role: m.role as "user" | "model",
                        content: m.content
                    }));

                    const prompt = `
                        O atendimento estava pausado e agora você (o assistente) está voltando a falar com o cliente.
                        Sua missão: Retomar a conversa de forma natural, relembrando brevemente o último ponto que pararam.
                        Não peça desculpas formais, apenas seja amigável (ex: "Opa, estou de volta! Estávamos falando sobre...").
                        Siga a personalidade do Bruno.
                    `.trim();

                    const config = (agent.config as any) || {};

                    const result = await AIService.generateStructuredResponse(
                        config.provider || "google",
                        config.model || "gemini-1.5-flash",
                        config.systemPrompt || "Você é o Bruno.",
                        [...formattedHistory, { role: "user", content: "[SISTEMA: Retomada automática após pausa]" }],
                        lead.conversationState || "START",
                        { ...lead, metaData: updatedMetadata, instruction: prompt },
                        0.7
                    );

                    // 4. Enviar e Salvar
                    if (result.body) {
                        await WhatsappService.sendText(lead.organizationId, lead.phone!, result.body);
                        
                        await MessageRepository.createSystem({
                            organizationId: lead.organizationId,
                            leadId: lead.id,
                            role: "model",
                            content: result.body,
                            whatsappMessageId: `resume_${Date.now()}`
                        });
                    }

                    console.log(`✅ [PauseService] Lead ${lead.name} retomado com sucesso.`);

                } catch (leadErr) {
                    console.error(`❌ [PauseService] Erro ao retomar lead ${lead.id}:`, leadErr);
                }
            }
        } catch (error) {
            console.error("❌ [PauseService] Erro crítico no processamento de retomadas:", error);
        }
    }
};
