require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function cleanDuplicates() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing");
        return;
    }

    const sql = postgres(connectionString);

    try {
        console.log("🔄 Iniciando limpeza agressiva de leads duplicados por JID...");

        // 1. Buscar todos os leads ordenados por data de criação (manter o mais antigo)
        const leads = await sql`SELECT id, organization_id, phone, name, metadata, created_at FROM leads ORDER BY created_at ASC`;
        
        const orgMap = {}; // orgId -> { canonicalId -> leadId }

        const getCanonicalId = (lead) => {
            // Tenta extrair um ID numérico puro do telefone ou do outreachJid
            const phone = lead.phone || "";
            const jid = lead.metadata?.outreachJid || lead.metadata?.remoteJid || "";
            
            let num = (jid.split("@")[0] || phone).replace(/\D/g, "");
            
            // Normalização de 9º dígito para o Brasil (55 + DDD + 8 ou 9 dígitos)
            if (num.startsWith("55") && num.length >= 12) {
                const ddd = num.substring(2, 4);
                const body = num.substring(4);
                if (body.length === 9 && body.startsWith("9")) {
                    return `55${ddd}${body.substring(1)}`; // Remove o 9
                }
            }
            return num;
        };

        let mergedCount = 0;

        for (const lead of leads) {
            const orgId = lead.organization_id;
            const canonical = getCanonicalId(lead);

            if (!canonical || canonical.length < 8) continue;

            if (!orgMap[orgId]) orgMap[orgId] = {};

            if (orgMap[orgId][canonical]) {
                const targetId = orgMap[orgId][canonical];
                console.log(`🤝 [Unificação] ${lead.name} (${canonical}) -> Lead Original ID: ${targetId}`);

                // Mover mensagens para o lead original
                await sql`UPDATE messages SET lead_id = ${targetId} WHERE lead_id = ${lead.id}`;

                // Mover tags
                const tagsToMove = await sql`SELECT tag_id FROM lead_tags WHERE lead_id = ${lead.id}`;
                for (const t of tagsToMove) {
                    await sql`
                        INSERT INTO lead_tags (lead_id, tag_id) 
                        VALUES (${targetId}, ${t.tag_id}) 
                        ON CONFLICT DO NOTHING
                    `;
                }

                // Deletar duplicata
                await sql`DELETE FROM lead_tags WHERE lead_id = ${lead.id}`;
                await sql`DELETE FROM leads WHERE id = ${lead.id}`;
                
                mergedCount++;
            } else {
                orgMap[orgId][canonical] = lead.id;
            }
        }

        console.log(`✅ Limpeza concluída! ${mergedCount} leads duplicados unificados.`);

    } catch (error) {
        console.error("❌ Erro na limpeza:", error);
    } finally {
        await sql.end();
    }
}

cleanDuplicates();
