
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "production") {
        console.warn("⚠️ Supabase: Variáveis de ambiente faltando (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)");
    }
}

export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    })
    : null;

/**
 * Service para gerenciar o backup de leads e mensagens no Supabase
 * evitando sobrecarga no PostgreSQL principal.
 */
export const SupabaseService = {
    async archiveLead(lead: any, messages: any[]) {
        if (!supabase) return;

        try {
            // Salva o lead
            const { error: leadError } = await supabase
                .from("leads_archive")
                .upsert({
                    id: lead.id,
                    organization_id: lead.organizationId,
                    phone: lead.phone,
                    name: lead.name,
                    status: lead.status,
                    meta_data: lead.metaData,
                    created_at: lead.createdAt,
                    archived_at: new Date().toISOString()
                });

            if (leadError) throw leadError;

            // Salva as mensagens
            if (messages.length > 0) {
                const { error: msgError } = await supabase
                    .from("messages_archive")
                    .insert(messages.map(m => ({
                        id: m.id,
                        lead_id: m.leadId,
                        organization_id: m.organizationId,
                        content: m.content,
                        role: m.role,
                        whatsapp_message_id: m.whatsappMessageId,
                        created_at: m.createdAt,
                    })));

                if (msgError) throw msgError;
            }

            console.log(`✅ [Supabase] Lead ${lead.phone} arquivado com sucesso.`);
            return true;
        } catch (error) {
            console.error("❌ [Supabase] Erro ao arquivar lead:", error);
            return false;
        }
    }
};
