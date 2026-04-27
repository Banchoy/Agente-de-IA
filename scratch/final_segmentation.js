const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function segment() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        // Buscar IDs dos estágios oficiais
        const stages = await sql`SELECT id, name FROM stages WHERE pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = ${orgId})`;
        const stageMap = {};
        stages.forEach(s => stageMap[s.name.toLowerCase()] = s.id);

        const idNovo = stageMap["novos leads"];
        const idAtendimento = stageMap["em atendimento (ia)"];

        if (!idNovo || !idAtendimento) return;

        console.log("Categorizando leads entre 'Novos' e 'Em Atendimento'...");

        // 1. Quem NÃO tem nenhuma mensagem -> Novos Leads
        const updateNew = await sql`
            UPDATE leads SET stage_id = ${idNovo} 
            WHERE organization_id = ${orgId} 
            AND id NOT IN (SELECT lead_id FROM messages WHERE organization_id = ${orgId})
        `;

        // 2. Quem TEM pelo menos uma mensagem -> Em Atendimento
        const updateActive = await sql`
            UPDATE leads SET stage_id = ${idAtendimento} 
            WHERE organization_id = ${orgId} 
            AND id IN (SELECT lead_id FROM messages WHERE organization_id = ${orgId})
        `;

        console.log(`Leads sem contato: ${updateNew.count} -> Coluna 'Novos Leads'`);
        console.log(`Leads com contato: ${updateActive.count} -> Coluna 'Em Atendimento'`);

    } catch (err) {
        console.error("Erro:", err.message);
    } finally {
        await sql.end();
    }
}

segment();
