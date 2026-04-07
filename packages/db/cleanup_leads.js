const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const sql = postgres(process.env.DATABASE_URL);

async function cleanupInactiveLeads() {
    console.log("🧹 Iniciando limpeza de leads inativos (Silêncio > 3 dias)...");

    try {
        // 1. Buscar o ID do estágio "Em Atendimento (IA)" para ser preciso
        // Mas o usuário pediu para limpar os que estão a mais tempo no banco.
        // Vamos focar em leads que não tem mensagens novas há 3 dias.

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        console.log(`📅 Critério: Leads sem atualização desde ${threeDaysAgo.toISOString()}`);

        // Encontrar leads para deletar
        const leadsToDelete = await sql`
            SELECT id, name, phone 
            FROM leads 
            WHERE updated_at < ${threeDaysAgo}
            AND ai_active = 'true'
            AND (
                stage_id IN (SELECT id FROM stages WHERE name ILIKE '%atendimento%' OR name ILIKE '%ia%')
                OR stage_id IS NULL
            )
        `;

        if (leadsToDelete.length === 0) {
            console.log("✅ Nenhum lead inativo encontrado para limpeza.");
            return;
        }

        console.log(`🗑️ Encontrados ${leadsToDelete.length} leads inativos. Deletando...`);

        const ids = leadsToDelete.map(l => l.id);

        // Deletar mensagens primeiro (Foreign Key constraint)
        await sql`
            DELETE FROM messages 
            WHERE lead_id IN ${sql(ids)}
        `;

        // Deletar vínculos de tags
        await sql`
            DELETE FROM lead_tags
            WHERE lead_id IN ${sql(ids)}
        `;

        // Deletar os leads
        await sql`
            DELETE FROM leads 
            WHERE id IN ${sql(ids)}
        `;

        console.log("✅ Limpeza concluída com sucesso!");
    } catch (error) {
        console.error("❌ Erro durante a limpeza:", error);
    } finally {
        await sql.end();
    }
}

cleanupInactiveLeads();
