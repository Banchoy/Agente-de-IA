require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function sync() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing");
        return;
    }

    const sql = postgres(connectionString);

    try {
        console.log("🔄 Iniciando sincronização de etiquetas IA ATIVA...");

        // 1. Buscar todas as organizações
        const orgs = await sql`SELECT id, name FROM organizations`;
        
        for (const org of orgs) {
            console.log(`🏢 Processando Org: ${org.name} (${org.id})`);

            // 2. Garantir que a tag "IA ATIVA" exista para esta Org
            let [iaTag] = await sql`SELECT id FROM tags WHERE organization_id = ${org.id} AND name ILIKE 'IA ATIVA' LIMIT 1`;
            
            if (!iaTag) {
                console.log(`🆕 Criando tag IA ATIVA para Org: ${org.name}`);
                [iaTag] = await sql`
                    INSERT INTO tags (organization_id, name, color, icon_name) 
                    VALUES (${org.id}, 'IA ATIVA', '#3b82f6', 'Bot') 
                    RETURNING id
                `;
            }

            // 3. Buscar todos os leads desta Org
            const leads = await sql`SELECT id, name, ai_active, metadata FROM leads WHERE organization_id = ${org.id}`;

            for (const lead of leads) {
                const aiActive = lead.ai_active === "true";
                const leadId = lead.id;

                // Verificar associação atual
                const [association] = await sql`SELECT id FROM lead_tags WHERE lead_id = ${leadId} AND tag_id = ${iaTag.id} LIMIT 1`;

                if (aiActive && !association) {
                    console.log(`🏷️ Atribuindo IA ATIVA -> Lead: ${lead.name}`);
                    await sql`INSERT INTO lead_tags (lead_id, tag_id) VALUES (${leadId}, ${iaTag.id}) ON CONFLICT DO NOTHING`;
                    
                    // Atualizar metadados do lead (JSONB merge)
                    const metadata = lead.metadata || {};
                    const currentTags = metadata.tags || [];
                    if (!currentTags.includes(iaTag.id)) {
                        const newMetadata = { ...metadata, tags: [...currentTags, iaTag.id] };
                        await sql`UPDATE leads SET metadata = ${newMetadata} WHERE id = ${leadId}`;
                    }
                } 
                else if (!aiActive && association) {
                    console.log(`🗑️ Removendo IA ATIVA -> Lead: ${lead.name}`);
                    await sql`DELETE FROM lead_tags WHERE lead_id = ${leadId} AND tag_id = ${iaTag.id}`;
                    
                    // Atualizar metadados do lead
                    const metadata = lead.metadata || {};
                    const currentTags = metadata.tags || [];
                    const newMetadata = { ...metadata, tags: currentTags.filter(id => id !== iaTag.id) };
                    await sql`UPDATE leads SET metadata = ${newMetadata} WHERE id = ${leadId}`;
                }
            }
        }

        console.log("✅ Sincronização concluída com sucesso!");

    } catch (error) {
        console.error("❌ Erro na sincronização:", error);
    } finally {
        await sql.end();
    }
}

sync();
