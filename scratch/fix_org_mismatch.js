const postgres = require('postgres');
const fs = require('fs');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function fix() {
    try {
        const targetOrg = 'c85ca1ee-cf4b-4692-b97a-9a825b4db994'; // Bruno Santos's Org (Clerk: org_3A4rnCwnfmBSLXRPpd7JIY87vux)
        const sourceOrg = '87ae4c14-2f79-4c29-8e30-40200d82b451'; // Atendimento Bruno

        console.log(`Iniciando migração de propriedade dos dados de ${sourceOrg} para ${targetOrg}...`);

        const leadsUpdate = await sql`UPDATE leads SET organization_id = ${targetOrg} WHERE organization_id = ${sourceOrg}`;
        console.log(`Leads movidos: ${leadsUpdate.count}`);

        const agentsUpdate = await sql`UPDATE agents SET organization_id = ${targetOrg} WHERE organization_id = ${sourceOrg}`;
        console.log(`Agentes movidos: ${agentsUpdate.count}`);

        const msgUpdate = await sql`UPDATE messages SET organization_id = ${targetOrg} WHERE organization_id = ${sourceOrg}`;
        console.log(`Mensagens movidas: ${msgUpdate.count}`);

        const pipeUpdate = await sql`UPDATE pipelines SET organization_id = ${targetOrg} WHERE organization_id = ${sourceOrg}`;
        console.log(`Pipelines movidos: ${pipeUpdate.count}`);

        // Importando as mensagens ativas que acabamos de ler do Supabase (arquivo local gerado anteriormente ou processado agora)
        // Como o arquivo steps/915/output.txt tem as mensagens, vou lê-lo.
        const msgDataRaw = fs.readFileSync('C:/Users/Lenovo/.gemini/antigravity/brain/6989d9c6-2a7f-4a50-9985-10882e6727e7/.system_generated/steps/915/output.txt', 'utf8');
        const msgJson = JSON.parse(msgDataRaw);
        // Extraindo o array de dentro do campo 'result' que contém as tags untrusted
        const msgArrayMatch = msgJson.result.match(/<untrusted-data-[^>]+>\n([\s\S]+?)\n<\/untrusted-data-/);
        if (msgArrayMatch) {
            const activeMessages = JSON.parse(msgArrayMatch[1]);
            console.log(`Importando ${activeMessages.length} mensagens ativas diretamente...`);
            for (const m of activeMessages) {
                try {
                    await sql`
                        INSERT INTO messages (id, organization_id, lead_id, role, content, whatsapp_message_id, created_at)
                        VALUES (${m.id}, ${targetOrg}, ${m.lead_id}, ${m.role}, ${m.content}, ${m.whatsapp_message_id}, ${m.created_at})
                        ON CONFLICT (id) DO NOTHING
                    `;
                } catch (e) {}
            }
        }


        console.log("Migração interna concluída com sucesso!");

    } catch (err) {
        console.error("Erro na migração:", err.message);
    } finally {
        await sql.end();
    }
}

fix();
