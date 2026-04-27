const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function audit() {
    try {
        console.log("--- Auditoria de Organizações ---");
        const orgs = await sql`SELECT id, name, clerk_org_id FROM organizations`;
        console.log('Organizações encontradas:', orgs.length);
        
        for (const org of orgs) {
            const leadsCount = await sql`SELECT COUNT(*) FROM leads WHERE organization_id = ${org.id}`;
            const agentsCount = await sql`SELECT COUNT(*) FROM agents WHERE organization_id = ${org.id}`;
            console.log(`Org: ${org.name} (${org.id}) | Clerk: ${org.clerk_org_id}`);
            console.log(`  - Leads: ${leadsCount[0].count}`);
            console.log(`  - Agentes: ${agentsCount[0].count}`);
        }

        console.log("\n--- Auditoria de Leads Órfãos (sem Org ou Org inexistente) ---");
        const orphanLeads = await sql`SELECT COUNT(*) FROM leads WHERE organization_id NOT IN (SELECT id FROM organizations)`;
        console.log('Leads órfãos:', orphanLeads[0].count);

    } catch (err) {
        console.error("Erro na auditoria:", err.message);
    } finally {
        await sql.end();
    }
}

audit();
