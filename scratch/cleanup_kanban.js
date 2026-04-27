const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function cleanup() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        console.log("--- LIMPANDO E REORGANIZANDO KANBAN ---");

        // 1. Identificar Pipeline
        const pipelines = await sql`SELECT id FROM pipelines WHERE organization_id = ${orgId} LIMIT 1`;
        if (pipelines.length === 0) {
            console.error("Nenhum pipeline encontrado!");
            return;
        }
        const pipeId = pipelines[0].id;

        // 2. Definir novos estágios desejados
        const targetStages = [
            { name: "Novos Leads", order: 0 },
            { name: "Em Atendimento (IA)", order: 1 },
            { name: "Perdido", order: 2 },
            { name: "Qualificado", order: 3 },
            { name: "Agendado Reunião", order: 4 },
            { name: "Vendido", order: 5 }
        ];

        // 3. Criar estágios novos (ou atualizar)
        const stageMap = {};
        for (const s of targetStages) {
            const existing = await sql`SELECT id FROM stages WHERE pipeline_id = ${pipeId} AND name = ${s.name} LIMIT 1`;
            if (existing.length > 0) {
                await sql`UPDATE stages SET "order" = ${s.order} WHERE id = ${existing[0].id}`;
                stageMap[s.name] = existing[0].id;
            } else {
                const result = await sql`
                    INSERT INTO stages (pipeline_id, name, "order")
                    VALUES (${pipeId}, ${s.name}, ${s.order})
                    RETURNING id
                `;
                stageMap[s.name] = result[0].id;
            }
            console.log(`Estágio '${s.name}' pronto (ID: ${stageMap[s.name]})`);
        }


        // 4. Deletar estágios DUPLICADOS ou antigos que não estão na lista
        const currentStages = await sql`SELECT id, name FROM stages WHERE pipeline_id = ${pipeId}`;
        const idsToKeep = Object.values(stageMap);
        
        for (const s of currentStages) {
            if (!idsToKeep.includes(s.id)) {
                // Antes de deletar, mover leads desses estágios para o "Novos Leads" ou "Em Atendimento"
                console.log(`Limpando estágio obsoleto: ${s.name} (${s.id})`);
                await sql`UPDATE leads SET stage_id = ${stageMap["Novos Leads"]} WHERE stage_id = ${s.id}`;
                await sql`DELETE FROM stages WHERE id = ${s.id}`;
            }
        }

        // 5. Mover leads baseado em mensagens
        console.log("Segmentando leads por atividade...");
        
        // Leads com zero mensagens -> Novos Leads
        const updateNew = await sql`
            UPDATE leads 
            SET stage_id = ${stageMap["Novos Leads"]} 
            WHERE organization_id = ${orgId} 
            AND id NOT IN (SELECT lead_id FROM messages WHERE organization_id = ${orgId})
        `;
        console.log(`Leads sem mensagens movidos para 'Novos Leads': ${updateNew.count}`);

        // Leads com mensagens -> Em Atendimento (IA)
        const updateActive = await sql`
            UPDATE leads 
            SET stage_id = ${stageMap["Em Atendimento (IA)"]} 
            WHERE organization_id = ${orgId} 
            AND id IN (SELECT lead_id FROM messages WHERE organization_id = ${orgId})
        `;
        console.log(`Leads com histórico movidos para 'Em Atendimento (IA)': ${updateActive.count}`);

        console.log("Canban limpo e organizado com sucesso!");

    } catch (err) {
        console.error("Erro no cleanup:", err.message);
    } finally {
        await sql.end();
    }
}

cleanup();
