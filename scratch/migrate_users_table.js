const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
    try {
        console.log('--- EXECUTANDO MIGRAÇÃO DDL NA TABELA USERS (RAILWAY) ---');
        
        // 1. Adicionar as novas colunas caso elas não existam
        console.log('\nAdicionando colunas de chaves de API...');
        await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
            ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
            ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT,
            ADD COLUMN IF NOT EXISTS apify_api_key TEXT,
            ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;
        `;
        console.log('✅ Colunas adicionadas com sucesso!');

        // 2. Verificar a estrutura da tabela para confirmar
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `;
        console.log('\nEstrutura atual da tabela "users":');
        console.log(columns);

    } catch (err) {
        console.error('❌ Erro ao rodar migração:', err);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
