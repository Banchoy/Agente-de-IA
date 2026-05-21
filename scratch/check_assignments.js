const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log('--- ANÁLISE DE ATRIBUIÇÃO DOS LEADS ---');
        
        const orgId = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        const stats = await sql`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN assigned_user_id IS NULL THEN 1 ELSE 0 END) as sem_atribuicao,
                SUM(CASE WHEN assigned_user_id IS NOT NULL THEN 1 ELSE 0 END) as com_atribuicao
            FROM leads
            WHERE organization_id = ${orgId};
        `;
        console.log('\nEstatísticas de Atribuição de Leads na Org:');
        console.log(stats);

        const recentLeads = await sql`
            SELECT id, name, assigned_user_id, created_at
            FROM leads
            WHERE organization_id = ${orgId}
            ORDER BY created_at DESC
            LIMIT 5;
        `;
        console.log('\nÚltimos 5 leads criados:');
        console.log(recentLeads);

    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
