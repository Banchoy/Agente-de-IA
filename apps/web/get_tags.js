const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

const client = postgres(connectionString);

async function run() {
    try {
        const tags = await client`SELECT * FROM "tags"`;
        console.log("ALL TAGS:\n", JSON.stringify(tags, null, 2));

        const blueTags = tags.filter(t => t.name.toLowerCase().includes('ia ativa') && t.color.includes('blue'));
        const greenTags = tags.filter(t => t.name.toLowerCase().includes('ia ativa') && t.color.includes('green'));
        
        console.log("Blue tags:", JSON.stringify(blueTags, null, 2));
        console.log("Green tags:", JSON.stringify(greenTags, null, 2));

        // If the user wants to swap them, we need to do it at lead level:
        // Leads have tags inside `metaData->'tags'` array, or maybe there's a mapping table?
        // Wait, Drizzle schema shows `tagsToLeads` or similar? Let's also check lead tables.
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
