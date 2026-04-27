
require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing");
        return;
    }

    const client = postgres(connectionString);
    
    try {
        console.log("🚀 Verificando e adicionando coluna 'whatsapp_instance_name' à tabela agents...");
        
        await client`
            ALTER TABLE agents 
            ADD COLUMN IF NOT EXISTS whatsapp_instance_name text;
        `;
        console.log("✅ Coluna verificada/adicionada com sucesso!");

        const res = await client`SELECT id, name, whatsapp_instance_name FROM agents`;
        console.log('Agentes atuais:', res);
        
    } catch (error) {
        console.error("❌ Erro ao atualizar tabela agents:", error);
    } finally {
        await client.end();
    }
}

main();
