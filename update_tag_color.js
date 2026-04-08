const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const postgres = require('postgres');
const client = postgres(process.env.DATABASE_URL);

async function run() {
    try {
        const result = await client`
            UPDATE "tags" 
            SET color = '#22c55e', icon_name = 'Bot'
            WHERE name ILIKE 'IA ATIVA'
            RETURNING id, name, color
        `;
        console.log('✅ Tag atualizada:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        process.exit(0);
    }
}
run();
