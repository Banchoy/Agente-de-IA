const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log('--- DIAGNÓSTICO DO BANCO DE DADOS PRINCIPAL (RAILWAY) ---');
        
        // 1. Contagem total de leads por organização
        const totalLeads = await sql`
            SELECT organization_id, COUNT(*), MIN(created_at) as mais_antigo, MAX(created_at) as mais_recente
            FROM leads
            GROUP BY organization_id;
        `;
        console.log('\nTotal de leads ativos no PostgreSQL por Organização:');
        console.log(totalLeads);

        // 2. Leads criados hoje (2026-05-18) no banco principal
        const todayLeads = await sql`
            SELECT id, name, phone, organization_id, source, created_at, stage_id
            FROM leads
            WHERE created_at >= '2026-05-17 00:00:00'
            ORDER BY created_at DESC;
        `;
        console.log(`\nLeads criados recentemente (a partir de 17/05/2026): ${todayLeads.length} encontrados.`);
        if (todayLeads.length > 0) {
            console.log(todayLeads.slice(0, 15));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
