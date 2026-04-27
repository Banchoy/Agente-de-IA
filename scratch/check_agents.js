
const { db } = require('./apps/web/src/lib/db');
const { agents } = require('./packages/db/src/schema');

async function main() {
    console.log('Checking agents table in Railway DB...');
    const result = await db.select().from(agents);
    console.log('Agents:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
