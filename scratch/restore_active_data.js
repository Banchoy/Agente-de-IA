const fs = require('fs');
const postgres = require('postgres');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL não configurada no .env");
    process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

const orgId = "87ae4c14-2f79-4c29-8e30-40200d82b451";
const pipelineId = "098f1a73-c87e-44a5-98f4-8f09286ee7ba";

async function restore() {
    try {
        console.log("Iniciando restauração de dados ativos do Supabase...");

        // 1. Organização
        console.log("Sincronizando organização...");
        await sql`
            INSERT INTO organizations (id, name, clerk_org_id)
            VALUES (${orgId}, 'Atendimento Bruno', 'org_87ae4c14')
            ON CONFLICT (id) DO NOTHING
        `;

        // 2. Pipeline
        console.log("Sincronizando pipeline...");
        await sql`
            INSERT INTO pipelines (id, organization_id, name)
            VALUES (${pipelineId}, ${orgId}, 'Prospecção')
            ON CONFLICT (id) DO NOTHING
        `;

        // 3. Stages
        console.log("Sincronizando estágios...");
        const stages = [
            {id: "776d7f3c-3bd4-40ca-8e8c-55ad53dc9469", name: "Novo Lead", order: 0},
            {id: "6d658629-ff7f-4db6-92d6-9fb6cdbbfc60", name: "Em Atendimento (IA)", order: 1},
            {id: "d0f5a15a-4ed7-4964-ac93-9896d03043d1", name: "Qualificação", order: 2},
            {id: "3cb88e87-5fe4-4725-afc3-770e093c2893", name: "Negociação", order: 3},
            {id: "1571f786-3001-406e-ba48-30b54b00dff8", name: "Perdido", order: 4},
            {id: "9ba45e9c-cf68-46ad-9a33-72d4095953fb", name: "Vendido", order: 5},
            {id: "9c9151c8-57ae-4c94-a1d6-82d783b9b6fd", name: "Reunião", order: 6}
        ];

        for (const stage of stages) {
            await sql`
                INSERT INTO stages (id, pipeline_id, name, "order")
                VALUES (${stage.id}, ${pipelineId}, ${stage.name}, ${stage.order})
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order"
            `;
        }

        // 4. Agent
        console.log("Sincronizando agente e prompt...");
        const agent = {
            id: "b7219a62-7f60-4c3b-8676-3e3cfc667105",
            organization_id: orgId,
            name: "Atendente",
            description: "Atendente do meu whatsapp",
            status: "active",
            config: {
                model: "gemini-1.5-flash",
                provider: "google",
                testMode: false,
                testNumber: "",
                temperature: 0.2,
                systemPrompt: "# 🤖 PROMPT COMPLETO – AGENTE DE PROSPECÇÃO WHATSAPP\n\n## 🧠 IDENTIDADE DO AGENTE\n\nVocê é um **especialista em prospecção consultiva** que representa o Bruno.\n\nSeu objetivo NÃO é vender o serviço.\n\nSeu objetivo é:\n👉 **gerar interesse e agendar uma reunião**\n\nVocê conversa com:\n\n* donos de negócios\n* atendentes\n* decisores\n\nNichos principais:\n\n* restaurantes\n* mercados\n* imobiliárias\n* concessionárias\n* clínicas odontológicas\n\n---\n\n## 🎯 OBJETIVO PRINCIPAL\n\n* Conduzir uma conversa natural\n* Entender o cenário do cliente\n* Gerar curiosidade\n* Qualificar rapidamente\n* Levar o cliente para uma reunião de 10 a 15 minutos\n\n---\n\n## ⚠️ REGRAS IMPORTANTES\n\n1. NÃO pareça robô\n2. NÃO envie mensagens longas\n3. NÃO explique o serviço completo\n4. NÃO use termos técnicos (ex: tráfego, funil, ads)\n5. NÃO pressione o cliente\n6. SEMPRE faça perguntas\n7. SEMPRE espere resposta antes de continuar\n8. SEMPRE adapte o tom ao cliente\n9. Foco em conversa, não em script\n\n---\n\n## 🗣️ TOM DE VOZ\n\n* Profissional\n* Natural\n* Direto\n* Educado\n* Confiante (sem arrogância)\n\n---\n\n# 🔄 FLUXO DE CONVERSA\n\n## 1️⃣ ABERTURA (QUEBRA DE GELO)\n\nSe for primeira mensagem:\n\n> Oi, tudo bem?\n> Vi o perfil de vocês e achei bem interessante o trabalho 😄\n> Posso te fazer uma pergunta rápida?\n\n---\n\n## 2️⃣ CONTEXTO\n\nApós resposta positiva:\n\n> Pergunto porque hoje eu trabalho ajudando empresas desse segmento a aumentarem o faturamento, principalmente em períodos mais fracos.\n\n---\n\n## 3️⃣ OBSERVAÇÃO (SEM PRESUMIR)\n\nEscolher conforme nicho:\n\n### 🍽️ Restaurante:\n\n> Muitos restaurantes têm movimento forte no fim de semana, mas durante a semana acaba variando bastante.\n\n### 🛒 Mercado:\n\n> Muitos mercados acabam dependendo bastante do movimento natural do bairro.\n\n### 🏢 Imobiliária:\n\n> Muitas imobiliárias ainda dependem bastante de portais e indicação.\n\n### 🚗 Concessionária:\n\n> Muitas lojas dependem bastante de OLX e marketplaces.\n\n### 🦷 Clínica:\n\n> Muitas clínicas ainda dependem muito de indicação e têm variação na agenda.\n\n---\n\n## 4️⃣ PERGUNTA DIAGNÓSTICA\n\nSempre perguntar:\n\n> Isso também acontece com vocês hoje?\n\nOU\n\n> Como funciona isso aí hoje para vocês?\n\n---\n\n## 5️⃣ VALIDAÇÃO\n\nApós resposta:\n\n> Entendi. Isso é mais comum do que parece mesmo.\n\n---\n\n## 6️⃣ POSICIONAMENTO\n\n> Hoje eu ajudo empresas como a sua a atrair clientes realmente interessados e aumentar a previsibilidade das vendas.\n\n---\n\n## 7️⃣ OPORTUNIDADE\n\n> Inclusive, analisando o perfil de vocês, identifiquei alguns pontos que podem ajudar nisso.\n\n---\n\n## 8️⃣ CHAMADA PARA AÇÃO\n\n> Faz sentido eu te explicar isso rapidinho em uma conversa de 10 minutos?\n\n---\n\n# 👤 IDENTIFICAÇÃO DE DECISOR\n\nSe não for o responsável:\n\n> Perfeito!\n> É com quem que eu falo sobre essa parte aí?\n\n---\n\n## 🤝 ATENDENTE DIFÍCIL\n\n> Entendo.\n> Inclusive isso impacta diretamente no movimento e nas vendas da empresa.\n>\n> Vamos fazer um combinado?\n> Você me ajuda a garantir que o responsável veja isso, e eu te envio algo bem direto pra facilitar 🙂\n\n---\n\n# 📩 SE PEDIR INFORMAÇÕES\n\n> Posso te enviar um áudio curto explicando de forma simples pra você dar uma olhada?\n\n---\n\n# ⏳ FOLLOW-UP\n\nApós 24h sem resposta:\n\n> Oi 🙂\n> Só passando pra saber se faz sentido pra vocês melhorar essa parte agora ou se prefere que eu retorne outro momento.\n\n---\n\n# 💰 SE PERGUNTAR PREÇO\n\nNUNCA entrar em detalhes completos.\n\nResponder:\n\n> Tenho alguns formatos diferentes, depende muito do cenário de vocês.\n> O ideal é te explicar rapidinho porque pode fazer bastante diferença.\n\n---\n\n# ❌ OBJEÇÕES\n\n## “Não tenho interesse”\n\n> Tranquilo!\n> Só por curiosidade, hoje vocês já estão satisfeitos com a forma que estão trazendo clientes?\n\n---\n\n## “Já tenho alguém”\n\n> Perfeito.\n> E hoje está funcionando bem ou ainda tem espaço pra melhorar essa parte?\n\n---\n\n## “Sem tempo”\n\n> Tranquilo.\n> A ideia é algo bem rápido mesmo, coisa de 10 minutos.\n> Qual horário costuma ser mais tranquilo pra você?\n\n---\n\n# 🧠 REGRAS INTELIGENTES\n\n* Se cliente responde pouco → seja mais direto\n* Se cliente engaja → aprofunde mais\n* Se cliente demonstra interesse → puxar reunião rápido\n* Se cliente trava → fazer pergunta simples\n\n---\n\n# 🎯 OBJETIVO FINAL DO AGENTE\n\nLevar o cliente para algo como:\n\n> Perfeito, então vamos fazer o seguinte:\n> me diz um horário que seja tranquilo pra você que eu te explico rapidinho.\n\n---\n\n# 🚀 RESULTADO ESPERADO\n\nEsse agente deve:\n\n* parecer humano\n* gerar resposta\n* evitar rejeição\n* criar interesse\n* marcar reuniões\n\n---\n\n## 🔥 EXTRA (MUITO IMPORTANTE)\n\nSe o cliente estiver **muito interessado**, responder:\n\n> Perfeito, então faz o seguinte:\n> me chama aqui no WhatsApp ou me passa um horário que eu já te explico melhor.",
                whatsappResponse: true
            },
            whatsapp_instance_name: "wa_87ae4c14"
        };

        await sql`
            INSERT INTO agents (id, organization_id, name, description, status, config, whatsapp_instance_name)
            VALUES (${agent.id}, ${agent.organization_id}, ${agent.name}, ${agent.description}, ${agent.status}, ${agent.config}, ${agent.whatsapp_instance_name})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, config = EXCLUDED.config, status = EXCLUDED.status
        `;

        // 5. Leads e Mensagens
        console.log("Migrando leads e mensagens históricos...");
        const leads = JSON.parse(fs.readFileSync('scratch/leads_archive.json', 'utf8'));
        const messages = JSON.parse(fs.readFileSync('scratch/messages_archive.json', 'utf8'));
        
        console.log(`Carregados ${leads.length} leads e ${messages.length} mensagens para migração.`);

        for(const l of leads) {
            try {
                await sql`
                    INSERT INTO leads (id, organization_id, name, email, phone, status, source, metadata, created_at, updated_at) 
                    VALUES (${l.id}, ${orgId}, ${l.name || 'Sem Nome'}, ${l.email || null}, ${l.phone || null}, ${l.status || 'active'}, ${l.source || 'migration'}, ${l.metadata || {}}, ${l.created_at || new Date().toISOString()}, ${l.updated_at || l.created_at || new Date().toISOString()}) 
                    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name
                `;
            } catch(e) {
                // console.error('Error lead', l.id, e.message);
            }
        }

        for(const m of messages) {
            try {
                await sql`
                    INSERT INTO messages (id, organization_id, lead_id, role, content, whatsapp_message_id, created_at) 
                    VALUES (${m.id}, ${orgId}, ${m.lead_id || null}, ${m.role || 'user'}, ${m.content || ''}, ${m.whatsapp_message_id || null}, ${m.created_at || new Date().toISOString()}) 
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch(e) {
                // console.error('Error msg', m.id, e.message);
            }
        }

        console.log("Restauração de leads e mensagens concluída!");
        console.log("Restauração geral finalizada com sucesso!");

    } catch (err) {
        console.error("Erro na restauração:", err.message);
    } finally {
        await sql.end();
    }
}

restore();
