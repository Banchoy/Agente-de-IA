require('dotenv').config({ path: '../../.env' });
const postgres = require('postgres');

async function analyze() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing");
        return;
    }

    const sql = postgres(connectionString);

    try {
        console.log("🔍 Analisando conversas recentes...");

        const messages = await sql`
            SELECT m.role, m.content, m.created_at, l.name as lead_name
            FROM messages m
            JOIN leads l ON m.lead_id = l.id
            ORDER BY m.created_at DESC
            LIMIT 50
        `;

        console.log("\n--- PANORAMA DAS CONVERSAS ---");
        messages.reverse().forEach(m => {
            const role = m.role === 'assistant' ? '🤖 Bruno' : `👤 ${m.lead_name || 'Cliente'}`;
            console.log(`[${m.created_at.toISOString()}] ${role}: ${m.content.substring(0, 150)}`);
        });

    } catch (error) {
        console.error("❌ Erro na análise:", error);
    } finally {
        await sql.end();
    }
}

analyze();
