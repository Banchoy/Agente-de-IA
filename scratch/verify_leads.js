const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function verify() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        const res = await sql`
            SELECT id, name, phone, (SELECT COUNT(*) FROM messages WHERE lead_id = leads.id) as msg_count 
            FROM leads 
            WHERE organization_id = ${orgId}
            ORDER BY msg_count ASC
            LIMIT 20
        `;
        console.log("Leads e contagem de mensagens:", res);

    } catch (err) {
        console.error("Erro na verificação:", err.message);
    } finally {
        await sql.end();
    }
}

verify();
