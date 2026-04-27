
require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function main() {
    const connectionString = process.env.DATABASE_URL;
    const client = postgres(connectionString);
    
    try {
        console.log("🚀 Auditando agente e sessões...");
        const agent = await client`SELECT id, name, organization_id, whatsapp_instance_name FROM agents LIMIT 1`;
        console.log('Agente:', agent[0]);
        
        const sess = await client`SELECT session_id, organization_id FROM whatsapp_sessions WHERE organization_id = ${agent[0].organization_id}`;
        console.log('Sessões para a Org do Agente:', sess);
        
    } catch (error) {
        console.error("❌ Erro:", error);
    } finally {
        await client.end();
    }
}

main();
