const fs = require('fs');
const postgres = require('postgres');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL não configurada no .env");
    process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function migrate() {
    try {
        console.log("Iniciando migração dos dados extraídos...");

        const leads = JSON.parse(fs.readFileSync('./scratch/leads_archive.json', 'utf8'));
        const messages = JSON.parse(fs.readFileSync('./scratch/messages_archive.json', 'utf8'));

        console.log(`Carregados ${leads.length} leads e ${messages.length} mensagens.`);

        // 1. Garantir que a organização existe
        const orgId = "e2bfe560-d097-4402-a3ea-891e1b301dad";
        const orgExists = await sql`SELECT id FROM organizations WHERE id = ${orgId}`;
        
        if (orgExists.length === 0) {
            console.log("Criando organização padrão...");
            await sql`
                INSERT INTO organizations (id, name, clerk_org_id)
                VALUES (${orgId}, 'Organização Migrada', 'org_migrated')
            `;
        }

        // 2. Importar Leads
        console.log("Importando leads...");
        let leadsMigrated = 0;
        for (const lead of leads) {
            try {
                await sql`
                    INSERT INTO leads (
                        id, organization_id, name, email, phone, status, source, metadata, created_at, updated_at
                    ) VALUES (
                        ${lead.id}, ${lead.organization_id}, ${lead.name || 'Sem Nome'}, ${lead.email || null}, 
                        ${lead.phone}, ${lead.status || 'active'}, ${lead.source || 'migration'}, 
                        ${lead.metadata || {}}, ${lead.created_at}, ${lead.updated_at}
                    ) ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        phone = EXCLUDED.phone,
                        metadata = EXCLUDED.metadata
                `;
                leadsMigrated++;
            } catch (err) {
                console.error(`Falha ao importar lead ${lead.id}:`, err.message);
            }
        }
        console.log(`${leadsMigrated} leads processados.`);

        // 3. Importar Mensagens
        console.log("Importando mensagens...");
        let msgsMigrated = 0;
        for (const msg of messages) {
            try {
                // Verificar se o lead existe antes de inserir a mensagem (foreign key)
                const leadExists = await sql`SELECT id FROM leads WHERE id = ${msg.lead_id}`;
                if (leadExists.length === 0) {
                    console.warn(`Pulando mensagem ${msg.id}: Lead ${msg.lead_id} não encontrado.`);
                    continue;
                }

                await sql`
                    INSERT INTO messages (
                        id, organization_id, lead_id, role, content, whatsapp_message_id, created_at
                    ) VALUES (
                        ${msg.id}, ${msg.organization_id}, ${msg.lead_id}, ${msg.role}, 
                        ${msg.content}, ${msg.whatsapp_message_id || null}, ${msg.created_at}
                    ) ON CONFLICT (id) DO NOTHING
                `;
                msgsMigrated++;
            } catch (err) {
                console.error(`Falha ao importar mensagem ${msg.id}:`, err.message);
            }
        }
        console.log(`${msgsMigrated} mensagens processadas.`);

        console.log("Migração concluída com sucesso!");
    } catch (err) {
        console.error("Erro crítico na migração:", err.message);
    } finally {
        await sql.end();
    }
}

migrate();
