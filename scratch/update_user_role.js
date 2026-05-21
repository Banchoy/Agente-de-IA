const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log('--- ATUALIZANDO ROLE DO USUÁRIO DE BRUNO ---');
        
        const clerkUserId = 'user_39Wu4TqDSEQWIhZbsTmyw5WmWfM';
        
        // 1. Verificar a role antes de atualizar
        const before = await sql`
            SELECT id, clerk_user_id, organization_id, role
            FROM users
            WHERE clerk_user_id = ${clerkUserId};
        `;
        console.log('\nDados do usuário antes da atualização:');
        console.log(before);

        if (before.length === 0) {
            console.error(`Usuário com Clerk User ID ${clerkUserId} não encontrado no banco.`);
            return;
        }

        const updateResult = await sql`
            UPDATE users
            SET role = 'master'
            WHERE clerk_user_id = ${clerkUserId};
        `;
        console.log(`\nColunas atualizadas: ${updateResult.count}`);

        // 3. Confirmar a role após atualização
        const after = await sql`
            SELECT id, clerk_user_id, organization_id, role
            FROM users
            WHERE clerk_user_id = ${clerkUserId};
        `;
        console.log('\nDados do usuário após a atualização:');
        console.log(after);

        console.log('\nRole de Bruno atualizada com sucesso no banco de dados principal (Railway)!');

    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
