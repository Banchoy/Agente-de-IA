
require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function main() {
    const connectionString = process.env.DATABASE_URL;
    const client = postgres(connectionString);
    
    try {
        console.log("🚀 Listando sessões de WhatsApp no Railway...");
        const res = await client`SELECT DISTINCT session_id, organization_id FROM whatsapp_sessions`;
        console.log('Sessões disponíveis:', res);
        
        const orgs = await client`SELECT id, name FROM organizations`;
        console.log('Organizações:', orgs);
        
    } catch (error) {
        console.error("❌ Erro:", error);
    } finally {
        await client.end();
    }
}

main();
