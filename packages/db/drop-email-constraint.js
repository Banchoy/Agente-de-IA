const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function dropConstraint() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Removendo Constraint de Email ---');
        await pool.query(`
            ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_org_unique;
            DROP INDEX IF EXISTS leads_email_org_unique;
        `);
        console.log('Constraint removida com sucesso!');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

dropConstraint();
