const postgres = require("postgres");

async function main() {
    const sql = postgres("postgresql://postgres:txoXugqeAxUjwdwkuVURhOWQKRQPRAcc@shortline.proxy.rlwy.net:25302/railway?sslmode=require");
    
    console.log("Conectado ao banco de dados!");
    
    // Lista colunas da tabela users
    const columns = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`;
    console.log("Colunas da tabela users:", columns);
    
    // Lista os primeiros 5 registros da tabela users
    const sample = await sql`SELECT * FROM users LIMIT 5`;
    console.log("Registros de exemplo:", sample);
    
    await sql.end();
}

main().catch(console.error);
