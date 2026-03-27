import { LeadRepository } from "../repositories/lead";
import { MessageRepository } from "../repositories/message";
import { SupabaseService } from "./supabase";
import { CRMRepository } from "../repositories/crm";

export const CleanupService = {
    /**
     * Processa a limpeza de leads inativos (padrão 2 dias para o fluxo da Tayná)
     */
    async processInactiveLeads(days: number = 2) {
        console.log(`🧹 [Cleanup] Iniciando limpeza de leads inativos (${days} dias)...`);
        
        try {
            // 1. Busca leads sem atividade recente
            const inactiveLeads = await LeadRepository.getInactiveLeads(days);
            
            if (inactiveLeads.length === 0) {
                console.log("✅ [Cleanup] Nenhum lead inativo encontrado.");
                return;
            }

            console.log(`📦 [Cleanup] Analisando ${inactiveLeads.length} leads para possível arquivamento.`);

            for (const lead of inactiveLeads) {
                try {
                    // 2. PRÉ-REQUISITO: Deve estar no estágio de "Atendimento"
                    const attendanceStageId = await CRMRepository.getStageByName(lead.organizationId, "Atendimento");
                    
                    if (lead.stageId !== attendanceStageId) {
                        // console.log(`⏭️ [Cleanup] Ignorando lead ${lead.phone} (estágio diferente de atendimento).`);
                        continue;
                    }

                    // 3. PRÉ-REQUISITO: Última mensagem deve ser do ASSISTANTE (lead não respondeu)
                    const lastMessages = await MessageRepository.listByLeadSystem(lead.id, 1);
                    const lastMsg = lastMessages[0];

                    if (!lastMsg || lastMsg.role !== "assistant") {
                        // Se a última mensagem for do user, ou não houver mensagens, não arquivamos ainda
                        continue;
                    }

                    console.log(`📌 [Cleanup] Lead ${lead.phone} qualificado para arquivamento (2 dias sem resposta).`);

                    // 4. Coleta TODAS as mensagens do lead para arquivar o histórico completo
                    const allMessages = await MessageRepository.listAllByLeadSystem(lead.id);
                    
                    // 5. Tenta arquivar no Supabase
                    const archived = await SupabaseService.archiveLead(lead, allMessages);
                    
                    if (archived) {
                        // 6. Se arquivou com sucesso, deleta do banco principal (Railway)
                        console.log(`🗑️ [Cleanup] Movido para Supabase. Deletando do banco principal: ${lead.phone}`);
                        await MessageRepository.deleteByLeadSystem(lead.id);
                        await LeadRepository.deleteSystem(lead.id);
                    }
                } catch (leadErr) {
                    console.error(`⚠️ [Cleanup] Erro ao processar lead ${lead.id}:`, leadErr);
                }
            }

            console.log("✅ [Cleanup] Processo de limpeza concluído.");
        } catch (error) {
            console.error("❌ [Cleanup] Erro crítico no processo de limpeza:", error);
        }
    }
};
