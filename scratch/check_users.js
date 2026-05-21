const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log('--- DIAGNÓSTICO DE USUÁRIOS E ORGANIZAÇÕES ---');
        
        const users = await sql`
            SELECT id, clerk_user_id, organization_id, role, created_at
            FROM users;
        `;
        console.log('\nUsuários no banco principal:');
        console.log(users);

        const orgs = await sql`
            SELECT id, name, clerk_org_id, created_at
            FROM organizations;
        `;
        console.log('\nOrganizações no banco principal:');
        console.log(orgs);

    } catch (err) {
        console.error(err);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
