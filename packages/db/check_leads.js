
require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function check() {
    const connectionString = process.env.DATABASE_URL;
    const client = postgres(connectionString);
    
    try {
        const [dbName] = await client`SELECT current_database() as name`;
        console.log(`📡 Conectado ao Banco: ${dbName.name}`);

        console.log("🔍 Verificando tabelas e schemas...");
        const tables = await client`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'leads';
        `;
        console.table(tables);
        
        console.log("🔍 Verificando Leads...");
        const leadData = await client`
            SELECT name, status, created_at
            FROM leads
            ORDER BY created_at DESC
            LIMIT 5;
        `;
        leadData.forEach(l => {
            console.log(`Lead: ${l.name} | Status: ${l.status} | Criado em: ${l.created_at}`);
        });
        
        console.log("✅ Verificação Completa.");

    } catch (error) {
        console.error("❌ Erro:", error);
    } finally {
        await client.end();
    }
}

check();
