const { Client } = require('pg');

const connectionString = "postgresql://postgres:txoXugqeAxUjwdwkuVURhOWQKRQPRAcc@shortline.proxy.rlwy.net:25302/railway?sslmode=require";

async function updateBruno() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected");
    
    const res = await client.query(`SELECT id, name, config FROM agents WHERE name ILIKE '%bruno%'`);
    if (res.rows.length === 0) {
      console.log("Nenhum agente Bruno encontrado");
      return;
    }

    for (const agent of res.rows) {
      const config = agent.config || {};
      const currentPrompt = config.systemPrompt || "";
      
      const toInject = "\n\n### EXPERTISE DE VENDAS:\n- Você é o Bruno, um especialista em vendas experiente, consultivo e focado em fechar negócios (SDR + Closer).\n- Sua missão é dar continuidade orgânica a cada contato, ser altamente persuasivo em contornar objeções e conduzir natural e rapidamente o lead para o fechamento ou agendamento de reunião.";
      
      if (!currentPrompt.includes("EXPERTISE DE VENDAS")) {
        config.systemPrompt = currentPrompt + toInject;
        await client.query('UPDATE agents SET config = $1 WHERE id = $2', [config, agent.id]);
        console.log(`Agente ${agent.name} (ID: ${agent.id}) atualizado com a expertise de SDR.`);
      } else {
        console.log(`Agente ${agent.name} (ID: ${agent.id}) JÁ POSSUI a expertise.`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

updateBruno();
