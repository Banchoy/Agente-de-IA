const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const postgres = require('postgres');
const client = postgres(process.env.DATABASE_URL);
async function run() {
    const allTags = await client`SELECT * FROM "tags"`;
    console.log(JSON.stringify(allTags, null, 2));
    process.exit(0);
}
run();
