const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function createLeadsArchive() {
    try {
        console.log("--- CRIANDO TABELA LEADS_ARCHIVE NO POSTGRES ---");

        await sql`
            CREATE TABLE IF NOT EXISTS leads_archive (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                phone TEXT,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'active' NOT NULL,
                meta_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            )
        `;

        console.log("✅ Tabela leads_archive criada ou já existente!");

    } catch (err) {
        console.error("❌ Erro ao criar tabela:", err.message);
    } finally {
        await sql.end();
    }
}

createLeadsArchive();
