const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
    try {
        const res = await sql`SELECT * FROM messages WHERE lead_id = 'fa07170c-a983-473e-ad0e-5782efa8871b'`;
        console.log("Mensagem do lead:", res);
    } catch (err) {
        console.error("Erro:", err.message);
    } finally {
        await sql.end();
    }
}

check();
