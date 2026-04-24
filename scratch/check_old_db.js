const postgres = require('postgres');

async function testConnection() {
    const newUrl = "postgresql://postgres:txoXugqcAxUjwdwkuVURhOWQKRQPRAcc@shortline.proxy.rlwy.net:25382/railway";
    const sql = postgres(newUrl, { connect_timeout: 30, max: 1 });

    for (let i = 0; i < 3; i++) {
        try {
            console.log(`Tentativa ${i+1}: Conectando ao banco NOVO...`);
            const res = await sql`SELECT 1 as connected`;
            console.log(`Conexão bem sucedida: ${res[0].connected}`);
            
            const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
            console.log("Tabelas encontradas:", tables.map(t => t.table_name).join(", "));
            
            await sql.end();
            return;
        } catch (err) {
            console.error(`Falha na tentativa ${i+1}:`, err.message);
            if (i < 2) await new Promise(r => setTimeout(r, 5000));
        }
    }
}

testConnection();
