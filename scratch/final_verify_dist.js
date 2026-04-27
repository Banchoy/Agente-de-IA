const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function verify() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        console.log("--- DISTRIBUIÇÃO FINAL ---");
        const res = await sql`
            SELECT s.name, COUNT(l.id) 
            FROM stages s 
            LEFT JOIN leads l ON l.stage_id = s.id 
            WHERE s.pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = ${orgId}) 
            GROUP BY s.name, s."order"
            ORDER BY s."order"
        `;
        console.log(res);

    } catch (err) {
        console.error("Erro na verificação:", err.message);
    } finally {
        await sql.end();
    }
}

verify();
