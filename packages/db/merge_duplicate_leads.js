require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function mergeLeads() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing");
        return;
    }

    const sql = postgres(connectionString);

    try {
        console.log("🔄 Iniciando fusão de leads duplicados...");

        // 1. Buscar todos os leads
        const allLeads = await sql`SELECT id, organization_id, phone, name, created_at FROM leads ORDER BY created_at ASC`;
        
        const orgMap = {}; // orgId -> { canonicalPhone -> leadId }

        const canonicalize = (num) => {
            if (!num) return null;
            let clean = num.replace(/\D/g, "");
            if (clean.startsWith("55") && clean.length >= 12) {
                const ddd = clean.substring(2, 4);
                const body = clean.substring(4);
                if (body.length === 9 && body.startsWith("9")) {
                    return `55${ddd}${body.substring(1)}`;
                }
                return clean;
            }
            return clean;
        };

        let mergedCount = 0;

        for (const lead of allLeads) {
            const orgId = lead.organization_id;
            const phone = lead.phone;
            const canonical = canonicalize(phone);

            if (!canonical) continue;

            if (!orgMap[orgId]) orgMap[orgId] = {};

            if (orgMap[orgId][canonical]) {
                const targetId = orgMap[orgId][canonical];
                console.log(`🤝 [Merge] Unificando ${lead.name} (${phone}) -> Lead Original ID: ${targetId}`);

                // 2. Mover mensagens
                await sql`UPDATE messages SET lead_id = ${targetId} WHERE lead_id = ${lead.id}`;

                // 3. Mover tags (Um por um para evitar erro de sintaxe ou conflito)
                const tagsToMove = await sql`SELECT tag_id FROM lead_tags WHERE lead_id = ${lead.id}`;
                for (const t of tagsToMove) {
                    await sql`
                        INSERT INTO lead_tags (lead_id, tag_id) 
                        VALUES (${targetId}, ${t.tag_id}) 
                        ON CONFLICT DO NOTHING
                    `;
                }

                // 4. Limpar e Deletar
                await sql`DELETE FROM lead_tags WHERE lead_id = ${lead.id}`;
                await sql`DELETE FROM leads WHERE id = ${lead.id}`;
                
                mergedCount++;
            } else {
                orgMap[orgId][canonical] = lead.id;
            }
        }

        console.log(`✅ Fusão concluída! ${mergedCount} leads duplicados unificados.`);

    } catch (error) {
        console.error("❌ Erro na fusão:", error);
    } finally {
        await sql.end();
    }
}

mergeLeads();
