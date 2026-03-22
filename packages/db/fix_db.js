
require('dotenv').config({ path: '../../.env' });
const { pgTable, uuid, text, timestamp } = require('drizzle-orm/pg-core');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function migrate() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing");
        return;
    }

    const client = postgres(connectionString);
    
    try {
        console.log("🚀 Adicionando colunas 'conversation_state' e 'last_intent' à tabela leads...");
        
        await client`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS conversation_state text DEFAULT 'START',
            ADD COLUMN IF NOT EXISTS last_intent text;
        `;
        console.log("✅ Colunas adicionadas com sucesso!");

        console.log("🏗️ Recuperando organizações...");
        const orgs = await client`SELECT id, name FROM organizations`;
        
        for (const org of orgs) {
            console.log(`🔍 Verificando CRM para org: ${org.name} (${org.id})`);
            
            // 1. Garantir Pipeline
            let [pipeline] = await client`SELECT id FROM pipelines WHERE organization_id = ${org.id} LIMIT 1`;
            if (!pipeline) {
                console.log(`🏗️ Criando pipeline padrão...`);
                [pipeline] = await client`INSERT INTO pipelines (name, organization_id) VALUES ('Pipeline de Vendas', ${org.id}) RETURNING id`;
            }

            // 2. Garantir Estágios
            const defaultStages = [
                { name: "Novo Lead", order: "0" },
                { name: "Em Atendimento (IA)", order: "1" },
                { name: "Qualificação", order: "2" },
                { name: "Negociação", order: "3" },
                { name: "Vendido", order: "4" },
                { name: "Perdido", order: "5" },
                { name: "Reunião", order: "6" }
            ];

            for (const s of defaultStages) {
                const [existing] = await client`SELECT id FROM stages WHERE pipeline_id = ${pipeline.id} AND name = ${s.name} LIMIT 1`;
                if (!existing) {
                    console.log(`➕ Adicionando estágio: ${s.name}`);
                    await client`INSERT INTO stages (pipeline_id, name, "order") VALUES (${pipeline.id}, ${s.name}, ${s.order})`;
                }
            }
        }
        console.log("✅ CRM Restaurado!");
        
    } catch (error) {
        console.error("❌ Erro na migração manual:", error);
    } finally {
        await client.end();
    }
}

migrate();
