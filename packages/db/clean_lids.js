const postgres = require("postgres");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const sql = postgres(process.env.DATABASE_URL);

async function cleanDuplicates() {
    console.log("🚀 Iniciando unificação agressiva de leads (LID Fix)...");

    try {
        // Encontrar leads que parecem ser duplicados (mesmo sufixo de telefone ou nome)
        const allLeads = await sql`
            SELECT id, phone, name, organization_id, created_at, metadata
            FROM leads
            ORDER BY created_at ASC
        `;

        const leadsByPhoneSuffix = new Map();
        const toDeleteIds = new Set();

        for (const lead of allLeads) {
            const cleanPhone = (lead.phone || "").replace(/\D/g, "");
            if (!cleanPhone || cleanPhone.length < 8) continue;
            
            const suffix = cleanPhone.slice(-8);
            const key = `${lead.organization_id}_${suffix}`;

            if (!leadsByPhoneSuffix.has(key)) {
                leadsByPhoneSuffix.set(key, lead);
                console.log(`📌 Mantendo original: ${lead.name} (${lead.phone}) [ID: ${lead.id}]`);
            } else {
                const original = leadsByPhoneSuffix.get(key);
                console.log(`🔄 Movendo duplicado: ${lead.name} (ID: ${lead.id}) -> Original: ${original.name} (ID: ${original.id})`);

                // 1. Mover mensagens
                await sql`
                    UPDATE messages 
                    SET lead_id = ${original.id} 
                    WHERE lead_id = ${lead.id}
                `;

                // 2. Mover etiquetas (se houver)
                await sql`
                    UPDATE leads_to_tags
                    SET lead_id = ${original.id}
                    WHERE lead_id = ${lead.id}
                    ON CONFLICT DO NOTHING
                `;

                // 3. Atualizar metadados do original com o possível novo JID/LID do duplicado
                const originalMeta = original.metadata || {};
                const dupeMeta = lead.metadata || {};
                const mergedMeta = { ...originalMeta, ...dupeMeta };
                
                await sql`
                    UPDATE leads
                    SET metadata = ${sql.json(mergedMeta)}
                    WHERE id = ${original.id}
                `;

                toDeleteIds.add(lead.id);
            }
        }

        // Deletar os duplicados (agora vazios)
        if (toDeleteIds.size > 0) {
            console.log(`🗑️ Deletando ${toDeleteIds.size} leads duplicados...`);
            await sql`
                DELETE FROM leads 
                WHERE id IN ${sql(Array.from(toDeleteIds))}
            `;
        }

        console.log("✅ Unificação concluída com sucesso!");
    } catch (error) {
        console.error("❌ Erro na limpeza:", error);
    } finally {
        await sql.end();
    }
}

cleanDuplicates();
