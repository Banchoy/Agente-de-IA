
const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log('Checking agents table schema and data...');
    
    // Check if column exists
    const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'whatsapp_instance_name';
    `);
    
    if (columnCheck.rows.length === 0) {
        console.error('CRITICAL: Column whatsapp_instance_name MISSING in database!');
    } else {
        console.log('Column whatsapp_instance_name exists.');
    }
    
    const res = await client.query('SELECT id, name, whatsapp_instance_name FROM agents');
    console.log('Agents records:', JSON.stringify(res.rows, null, 2));
    
    await client.end();
}

main().catch(console.error);
