const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function remap() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        console.log("Buscando estágios atuais...");
        const newStages = await sql`SELECT id, name FROM stages WHERE pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = ${orgId})`;
        console.log("Estágios encontrados:", newStages);

        const stageMap = {};
        newStages.forEach(s => {
            stageMap[s.name.toLowerCase()] = s.id;
        });

        // Mapeamento esperado (nomes do Supabase)
        const oldStageNames = [
            "Novo Lead", 
            "Em Atendimento (IA)", 
            "Qualificação", 
            "Negociação", 
            "Perdido", 
            "Vendido", 
            "Reunião"
        ];

        console.log("Remapeando leads...");
        for (const name of oldStageNames) {
            const targetStageId = stageMap[name.toLowerCase()];
            if (targetStageId) {
                // Como não sabemos o ID antigo no Supabase (mudamos o ID no insert se usamos defaults ou se o Clerk gerou novos)
                // Vamos apenas garantir que se o lead está COM STATUS condizente, ele vá para a coluna certa.
                // Mas o mais provável é que os leads estejam com um stage_id que não existe mais nessa Org.
                
                // Vamos tentar um update baseado no nome do estágio se tivéssemos essa info no lead.
                // Na verdade, na migração os leads vieram com stage_id fixos que eu defini (se defini).
                
                // Vou fazer o seguinte: todos os leads que estão sem estágio válido na Org, vou colocar no "Novo Lead".
                // Ou se eu tiver a info do status, eu uso.
            }
        }

        // Simplificação: Colocar todos os leads da Org no primeiro estágio encontrado se o stage_id deles não estiver na lista de estágios da Org.
        const firstStageId = stageMap["novo lead"];
        if (firstStageId) {
            const result = await sql`
                UPDATE leads 
                SET stage_id = ${firstStageId} 
                WHERE organization_id = ${orgId} 
                AND (stage_id IS NULL OR stage_id NOT IN (SELECT id FROM stages WHERE pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = ${orgId})))
            `;
            console.log(`Leads movidos para 'Novo Lead': ${result.count}`);
        }

    } catch (err) {
        console.error("Erro no remapeamento:", err.message);
    } finally {
        await sql.end();
    }
}

remap();
