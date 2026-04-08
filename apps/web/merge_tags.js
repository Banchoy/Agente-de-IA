const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not found. Current dir:', __dirname);
    process.exit(1);
}

const client = postgres(connectionString);

async function run() {
    try {
        console.log("Conectando ao banco de dados...");
        const allTags = await client`SELECT * FROM "tags"`;
        
        console.log(`Buscando tags com "IA"...`);
        const iaTags = allTags.filter(t => t.name.toLowerCase().includes('ia'));
        
        console.log("Tags encontradas:", JSON.stringify(iaTags, null, 2));

        const blueTags = iaTags.filter(t => t.color.toLowerCase().includes('blue') || t.color.toLowerCase() === '#3b82f6' || t.color === '#2563eb');
        const greenTags = iaTags.filter(t => t.color.toLowerCase().includes('green') || t.color.toLowerCase() === '#22c55e' || t.color === '#16a34a' || t.color === '#10b981');
        
        console.log(`AZUL: ${blueTags.length}`);
        console.log(`VERDE: ${greenTags.length}`);

        if (blueTags.length > 0 && greenTags.length > 0) {
            const blueTag = blueTags[0];
            const greenTag = greenTags[0];
            console.log(`MIGRAÇÃO: Movendo leads da tag Azul (${blueTag.id}) para a Verde (${greenTag.id})`);
            
            // Atribuir os leads que tem a tag azul para a tag verde (evitando duplicatas)
            await client`
                INSERT INTO "lead_tags" ("id", "lead_id", "tag_id")
                SELECT gen_random_uuid(), "lead_id", ${greenTag.id}
                FROM "lead_tags"
                WHERE "tag_id" = ${blueTag.id}
                ON CONFLICT DO NOTHING
            `;
            
            console.log("Leads migrados para a tag verde com sucesso.");
            
            // Deletar a tag azul (e, por cascade, os seus registros em lead_tags)
            await client`DELETE FROM "tags" WHERE "id" = ${blueTag.id}`;
            console.log("Tag azul deletada com sucesso.");
            
        } else {
             console.log("Impossível fazer a migração. Uma das tags não foi localizada nas cores corretas.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
