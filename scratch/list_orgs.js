const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log("=== LISTANDO ORGANIZAÇÕES NO BANCO DE DADOS ===");
        const orgs = await sql`
            SELECT id, name, clerk_org_id, created_at 
            FROM organizations;
        `;
        console.log(orgs);
    } catch (e) {
        console.error("Erro:", e.message);
    } finally {
        await sql.end();
    }
}

main();
