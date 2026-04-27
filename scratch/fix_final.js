const postgres = require('postgres');
const fs = require('fs');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function fix() {
    try {
        const targetOrg = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994';
        
        // 1. Corrigir colunas (Stages)
        // O log do CRM mostra: Novo Lead (ID: fe1a0131-2743-4b65-a0df-cb2620d64f12)
        const uiNovoLeadId = 'fe1a0131-2743-4b65-a0df-cb2620d64f12';
        console.log(`Remapeando leads para o estágio da UI: ${uiNovoLeadId}`);
        const leadsUpdate = await sql`UPDATE leads SET stage_id = ${uiNovoLeadId} WHERE organization_id = ${targetOrg}`;
        console.log(`Leads movidos para a coluna correta: ${leadsUpdate.count}`);

        // 2. Importar Mensagens
        console.log("Iniciando importação massiva de mensagens...");
        const msgFiles = ['scratch/messages_archive.json', 'C:/Users/Lenovo/.gemini/antigravity/brain/6989d9c6-2a7f-4a50-9985-10882e6727e7/.system_generated/steps/915/output.txt'];
        
        let totalImported = 0;

        for (const file of msgFiles) {
            try {
                let messages = [];
                const dataRaw = fs.readFileSync(file, 'utf8');
                if (file.endsWith('.json')) {
                    messages = JSON.parse(dataRaw);
                } else {
                    const msgJson = JSON.parse(dataRaw);
                    const msgArrayMatch = msgJson.result.match(/<untrusted-data-[^>]+>\n([\s\S]+?)\n<\/untrusted-data-/);
                    if (msgArrayMatch) {
                        messages = JSON.parse(msgArrayMatch[1]);
                    }
                }

                console.log(`Lidas ${messages.length} mensagens de ${file}`);
                for (const m of messages) {
                    try {
                        // Limpando campos que podem vir vazios ou errados do JSON
                        const role = m.role || 'user';
                        const content = m.content || '';
                        const lead_id = m.lead_id || m.leadId;
                        const created_at = m.created_at || m.createdAt || new Date().toISOString();

                        await sql`
                            INSERT INTO messages (id, organization_id, lead_id, role, content, whatsapp_message_id, created_at)
                            VALUES (${m.id}, ${targetOrg}, ${lead_id}, ${role}, ${content}, ${m.whatsapp_message_id || null}, ${created_at})
                            ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, lead_id = EXCLUDED.lead_id
                        `;
                        totalImported++;
                    } catch (e) {
                        // console.error(`Erro na msg ${m.id}:`, e.message);
                    }
                }
            } catch (err) {
                console.warn(`Erro ao processar arquivo ${file}:`, err.message);
            }
        }

        console.log(`Finalizado! Total de mensagens processadas/atualizadas: ${totalImported}`);

    } catch (err) {
        console.error("Erro no fix final:", err.message);
    } finally {
        await sql.end();
    }
}

fix();
