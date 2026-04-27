
const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function checkConstraints() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Verificando Constraints ---');
        const resConstraints = await pool.query(`
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conname IN ('leads_phone_org_unique', 'leads_email_org_unique')
        `);
        console.table(resConstraints.rows);

        console.log('\n--- Verificando Índices ---');
        const resIndexes = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE indexname IN ('leads_phone_org_unique', 'leads_email_org_unique')
        `);
        console.table(resIndexes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkConstraints();
