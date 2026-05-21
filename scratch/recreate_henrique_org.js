const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log("=== VERIFICANDO USUÁRIOS NA ORG DO HENRIQUE ===");

        const clerkOrgId = 'org_3DPfPGpnZXH91hE1i8ZdKNNN0rq';

        // 1. Achar a organização no banco
        const [org] = await sql`
            SELECT id, name FROM organizations WHERE clerk_org_id = ${clerkOrgId};
        `;

        if (!org) {
            console.error("Organização do Henrique não foi encontrada no banco.");
            return;
        }

        console.log(`Organização encontrada: ${org.name} (ID: ${org.id})`);

        // 2. Achar todos os usuários vinculados à organização
        const orgUsers = await sql`
            SELECT id, clerk_user_id, role FROM users WHERE organization_id = ${org.id};
        `;

        console.log("Usuários vinculados atuais:", orgUsers);

        // 3. Atualizar administrador (ou todos os usuários administradores) para 'admin_test'
        if (orgUsers.length > 0) {
            const adminUser = orgUsers.find(u => u.role === 'admin' || u.role === 'admin_test') || orgUsers[0];
            console.log(`\nAtualizando usuário ${adminUser.clerk_user_id} para a role 'admin_test'...`);
            
            const [updated] = await sql`
                UPDATE users
                SET role = 'admin_test'
                WHERE id = ${adminUser.id}
                RETURNING id, clerk_user_id, role;
            `;
            console.log("✅ Usuário atualizado com sucesso:", updated);
        } else {
            console.log("\nNenhum usuário foi cadastrado na organização ainda.");
        }

    } catch (e) {
        console.error("Erro:", e.message);
    } finally {
        await sql.end();
    }
}

main();
