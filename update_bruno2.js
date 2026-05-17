const postgres = require('postgres');

const sql = postgres("postgresql://postgres:txoXugqeAxUjwdwkuVURhOWQKRQPRAcc@shortline.proxy.rlwy.net:25302/railway?sslmode=require");

async function updateBruno() {
  try {
    const agents = await sql`SELECT id, name, config FROM agents WHERE name ILIKE '%bruno%'`;
    if (agents.length === 0) {
      console.log("Nenhum agente Bruno encontrado");
      process.exit(0);
    }

    for (const agent of agents) {
      const config = agent.config || {};
      const currentPrompt = config.systemPrompt || "";
      
      const toInject = "\n\n### EXPERTISE DE VENDAS (MÁXIMA PRIORIDADE):\n- Você é o Bruno, um especialista em vendas experiente, consultivo e focado em fechar negócios (SDR + Closer).\n- Sua missão é dar continuidade orgânica a cada contato, ser altamente persuasivo em contornar objeções ('tá caro', 'sem tempo', 'sou pequeno') e conduzir natural e rapidamente o lead para o fechamento ou agendamento de reunião.\n- Não perca o tom fluido e confiante de um parceiro de negócios.";
      
      if (!currentPrompt.includes("EXPERTISE DE VENDAS")) {
        config.systemPrompt = currentPrompt + toInject;
        await sql`UPDATE agents SET config = ${sql.json(config)} WHERE id = ${agent.id}`;
        console.log(`Agente ${agent.name} (ID: ${agent.id}) atualizado com a expertise.`);
      } else {
        console.log(`Agente ${agent.name} (ID: ${agent.id}) JÁ POSSUI a expertise.`);
      }
    }
    console.log("Concluído com sucesso.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateBruno();
