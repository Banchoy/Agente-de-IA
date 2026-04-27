const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function cleanup() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        console.log("--- LIMPANDO DUPLICATAS DE COLUNAS ---");

        const pipelines = await sql`SELECT id FROM pipelines WHERE organization_id = ${orgId}`;
        for (const pipe of pipelines) {
            const stages = await sql`SELECT id, name FROM stages WHERE pipeline_id = ${pipe.id}`;
            
            // Queremos apenas estes nomes únicos
            const targetNames = [
                "Novos Leads", 
                "Em Atendimento (IA)", 
                "Perdido", 
                "Qualificado", 
                "Agendado Reunião", 
                "Vendido"
            ];

            // 1. Criar um mapa do PRIMEIRO ID de cada nome
            const canonicalIds = {};
            for (const name of targetNames) {
                // Tenta achar um que já existe
                const match = stages.find(s => s.name.toLowerCase() === name.toLowerCase());
                if (match) {
                    canonicalIds[name] = match.id;
                } else {
                    // Se não existe, cria
                    const nextOrder = targetNames.indexOf(name);
                    const newlyCreated = await sql`
                        INSERT INTO stages (pipeline_id, name, "order") 
                        VALUES (${pipe.id}, ${name}, ${nextOrder}) 
                        RETURNING id
                    `;
                    canonicalIds[name] = newlyCreated[0].id;
                }
            }

            // 2. Mover todos os leads para os IDs canônicos
            for (const s of stages) {
                const canonicalId = Object.entries(canonicalIds).find(([name, id]) => name.toLowerCase() === s.name.toLowerCase())?.[1];
                if (canonicalId && canonicalId !== s.id) {
                    console.log(`Consolidando leads de ${s.name} (${s.id}) para ${canonicalId}`);
                    await sql`UPDATE leads SET stage_id = ${canonicalId} WHERE stage_id = ${s.id}`;
                }
            }

            // 3. Deletar tudo que não for ID Canônico
            const keepIds = Object.values(canonicalIds);
            const deleted = await sql`DELETE FROM stages WHERE pipeline_id = ${pipe.id} AND id != ALL(${keepIds})`;
            console.log(`Colunas duplicadas removidas: ${deleted.count}`);
        }


        console.log("Limpeza de duplicatas finalizada!");

    } catch (err) {
        console.error("Erro no cleanup:", err.message);
    } finally {
        await sql.end();
    }
}

cleanup();
