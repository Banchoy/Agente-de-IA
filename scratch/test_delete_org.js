const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function deleteOrg(orgId) {
    try {
        console.log(`\n=== TESTANDO DELEÇÃO PARA A ORG ${orgId} ===`);

        // A. message_tags e messages
        console.log("Deletando message_tags e messages...");
        const orgMessages = await sql`
            SELECT id FROM messages WHERE organization_id = ${orgId};
        `;
        if (orgMessages.length > 0) {
            const msgIds = orgMessages.map(m => m.id);
            await sql`
                DELETE FROM message_tags WHERE message_id IN ${sql(msgIds)};
            `;
            await sql`
                DELETE FROM messages WHERE organization_id = ${orgId};
            `;
            console.log(`- Removido ${orgMessages.length} mensagens.`);
        }

        // B. lead_tags e leads
        console.log("Deletando lead_tags e leads...");
        const orgLeads = await sql`
            SELECT id FROM leads WHERE organization_id = ${orgId};
        `;
        if (orgLeads.length > 0) {
            const leadIds = orgLeads.map(l => l.id);
            await sql`
                DELETE FROM lead_tags WHERE lead_id IN ${sql(leadIds)};
            `;
            await sql`
                DELETE FROM leads WHERE organization_id = ${orgId};
            `;
            console.log(`- Removido ${orgLeads.length} leads.`);
        }

        // C. leads_archive
        console.log("Deletando de leads_archive...");
        try {
            await sql`DELETE FROM leads_archive WHERE organization_id = ${orgId};`;
            console.log("- Limpou leads_archive.");
        } catch (e) {
            console.log("- Sem leads_archive ou erro:", e.message);
        }

        // D. whatsapp_sessions
        console.log("Deletando whatsapp_sessions...");
        await sql`DELETE FROM whatsapp_sessions WHERE organization_id = ${orgId};`;

        // E. agents
        console.log("Deletando agents...");
        await sql`DELETE FROM agents WHERE organization_id = ${orgId};`;

        // F. workflows
        console.log("Deletando workflows...");
        await sql`DELETE FROM workflows WHERE organization_id = ${orgId};`;

        // G. stages e pipelines
        console.log("Deletando stages e pipelines...");
        const orgPipelines = await sql`
            SELECT id FROM pipelines WHERE organization_id = ${orgId};
        `;
        if (orgPipelines.length > 0) {
            const pipeIds = orgPipelines.map(p => p.id);
            await sql`
                DELETE FROM stages WHERE pipeline_id IN ${sql(pipeIds)};
            `;
            await sql`
                DELETE FROM pipelines WHERE organization_id = ${orgId};
            `;
            console.log(`- Removido ${orgPipelines.length} pipelines.`);
        }

        // H. meta_integrations
        console.log("Deletando meta_integrations...");
        await sql`DELETE FROM meta_integrations WHERE organization_id = ${orgId};`;

        // I. audit_logs
        console.log("Deletando audit_logs...");
        await sql`DELETE FROM audit_logs WHERE organization_id = ${orgId};`;

        // J. tags
        console.log("Deletando tags...");
        await sql`DELETE FROM tags WHERE organization_id = ${orgId};`;

        // K. users
        console.log("Deletando users...");
        await sql`DELETE FROM users WHERE organization_id = ${orgId};`;

        // L. organizations
        console.log("Deletando a organization final...");
        await sql`DELETE FROM organizations WHERE id = ${orgId};`;

        console.log("✅ EXCLUSÃO DE TESTE REALIZADA COM SUCESSO!");
    } catch (err) {
        console.error("❌ ERRO CRÍTICO NA DELEÇÃO DO BANCO:", err);
    }
}

// Vamos tentar deletar a "henrique's Org" que é cc8ddabe-6ce4-4c92-99a3-3c669db0030e
deleteOrg("cc8ddabe-6ce4-4c92-99a3-3c669db0030e").then(() => sql.end());
