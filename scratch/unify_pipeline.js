const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function unify() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        console.log("--- UNIFICANDO PIPELINES E ESTÁGIOS ---");

        // 1. Pegar todos os pipelines
        const pipelines = await sql`SELECT id, name FROM pipelines WHERE organization_id = ${orgId}`;
        console.log("Pipelines encontrados:", pipelines);

        if (pipelines.length === 0) {
            console.log("Nenhum pipeline. Criando um padrão...");
            const res = await sql`INSERT INTO pipelines (organization_id, name) VALUES (${orgId}, 'Pipeline de Vendas') RETURNING id`;
            pipelines.push(res[0]);
        }

        // Usaremos o PRIMEIRO como oficial
        const masterPipeId = pipelines[0].id;
        console.log(`Pipeline Mestre Eleito: ${masterPipeId}`);

        // 2. Definir os estágios oficiais que o usuário quer
        const officialStages = [
            { name: "Novos Leads", order: 0 },
            { name: "Em Atendimento (IA)", order: 1 },
            { name: "Perdido", order: 2 },
            { name: "Qualificado", order: 3 },
            { name: "Agendado Reunião", order: 4 },
            { name: "Vendido", order: 5 }
        ];

        // 3. Criar estágios oficiais no Master Pipeline
        const masterStageMap = {};
        for (const s of officialStages) {
            const result = await sql`
                INSERT INTO stages (pipeline_id, name, "order")
                VALUES (${masterPipeId}, ${s.name}, ${s.order})
                RETURNING id
            `;
            masterStageMap[s.name.toLowerCase()] = result[0].id;
            console.log(`- Estágio Oficial: ${s.name} -> ${result[0].id}`);
        }

        // 4. Mover todos os leads de QUALQUER pipeline/estágio da org para os novos oficiais
        const allStages = await sql`SELECT id, name FROM stages WHERE pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = ${orgId})`;
        
        for (const oldS of allStages) {
            // Se for um dos que acabamos de criar, pula
            if (Object.values(masterStageMap).includes(oldS.id)) continue;

            const targetId = masterStageMap[oldS.name.toLowerCase()] || masterStageMap["novos leads"];
            console.log(`Movendo leads de [${oldS.name} (${oldS.id})] para [Oficial (${targetId})]`);
            
            await sql`UPDATE leads SET stage_id = ${targetId} WHERE stage_id = ${oldS.id}`;
        }

        // 5. Deletar os outros pipelines e estágios obsoletos
        console.log("Limpando sobras...");
        const oldPipes = pipelines.slice(1).map(p => p.id);
        if (oldPipes.length > 0) {
            await sql`DELETE FROM stages WHERE pipeline_id = ANY(${oldPipes})`;
            await sql`DELETE FROM pipelines WHERE id = ANY(${oldPipes})`;
        }
        
        // Deletar estágios do master que não são os novos (caso tenha sobrado algo antes)
        await sql`DELETE FROM stages WHERE pipeline_id = ${masterPipeId} AND id != ALL(${Object.values(masterStageMap)})`;

        console.log("--- FINALIZADO COM SUCESSO ---");

    } catch (err) {
        console.error("Erro na unificação:", err.message);
    } finally {
        await sql.end();
    }
}

unify();
