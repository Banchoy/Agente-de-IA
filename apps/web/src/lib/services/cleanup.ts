
import { LeadRepository } from "../repositories/lead";
import { MessageRepository } from "../repositories/message";
import { SupabaseService } from "./supabase";

export const CleanupService = {
    /**
     * Processa a limpeza de leads inativos (padrão 3 dias)
     */
    async processInactiveLeads(days: number = 3) {
        console.log(`🧹 [Cleanup] Iniciando limpeza de leads inativos (${days} dias)...`);
        
        try {
            const inactiveLeads = await LeadRepository.getInactiveLeads(days);
            
            if (inactiveLeads.length === 0) {
                console.log("✅ [Cleanup] Nenhum lead inativo encontrado.");
                return;
            }

            console.log(`📦 [Cleanup] ${inactiveLeads.length} leads identificados para arquivamento.`);

            for (const lead of inactiveLeads) {
                // 1. Coleta todas as mensagens do lead
                const allMessages = await MessageRepository.listAllByLeadSystem(lead.id);
                
                // 2. Tenta arquivar no Supabase
                const archived = await SupabaseService.archiveLead(lead, allMessages);
                
                if (archived) {
                    // 3. Se arquivou, deleta do banco principal
                    console.log(`🗑️ [Cleanup] Deletando lead ${lead.phone} do banco principal...`);
                    await MessageRepository.deleteByLeadSystem(lead.id);
                    await LeadRepository.deleteSystem(lead.id);
                } else {
                    console.warn(`⚠️ [Cleanup] Falha ao arquivar lead ${lead.phone}. Pulando deleção.`);
                }
            }

            console.log("✅ [Cleanup] Processo de limpeza concluído.");
        } catch (error) {
            console.error("❌ [Cleanup] Erro crítico no processo de limpeza:", error);
        }
    }
};
