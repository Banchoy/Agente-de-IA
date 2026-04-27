const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function dump() {
    try {
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        console.log(`--- DUMP ORG ${orgId} ---`);
        
        const org = await sql`SELECT * FROM organizations WHERE id = ${orgId}`;
        console.log('Org:', org);

        const pipes = await sql`SELECT * FROM pipelines WHERE organization_id = ${orgId}`;
        console.log('Pipelines:', pipes);

        const stages = await sql`SELECT * FROM stages WHERE pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = ${orgId})`;
        console.log('Stages:', stages);

        const agent = await sql`SELECT * FROM agents WHERE organization_id = ${orgId}`;
        console.log('Agent:', agent);

        const leads = await sql`SELECT COUNT(*), stage_id FROM leads WHERE organization_id = ${orgId} GROUP BY stage_id`;
        console.log('Leads count by stage:', leads);

        const msgs = await sql`SELECT COUNT(*) FROM messages WHERE organization_id = ${orgId}`;
        console.log('Messages count:', msgs[0].count);

    } catch (err) {
        console.error("Erro no dump:", err.message);
    } finally {
        await sql.end();
    }
}

dump();
