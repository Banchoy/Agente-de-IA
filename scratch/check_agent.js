const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
    try {
        const res = await sql`SELECT id, organization_id, name, whatsapp_instance_name FROM agents`;
        console.log("Agentes no DB:", res);
    } catch (err) {
        console.error("Erro:", err.message);
    } finally {
        await sql.end();
    }
}

check();
