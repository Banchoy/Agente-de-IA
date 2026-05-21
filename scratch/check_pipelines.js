const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log('--- DIAGNÓSTICO DE PIPELINES E STAGES ---');
        
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        const pipelines = await sql`
            SELECT id, name, organization_id, created_at
            FROM pipelines
            WHERE organization_id = ${orgId};
        `;
        console.log('\nPipelines da Org:');
        console.log(pipelines);

        const stages = await sql`
            SELECT id, name, pipeline_id, "order", created_at
            FROM stages
            WHERE pipeline_id IN (
                SELECT id FROM pipelines WHERE organization_id = ${orgId}
            )
            ORDER BY pipeline_id, "order";
        `;
        console.log('\nStages da Org:');
        console.log(stages);

    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
