const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
});

const AUDIO_INSTRUCTION = `

⚠️ CAPACIDADE DE ÁUDIO NO WHATSAPP:
Você PODE enviar áudios reais agora!
Sempre que quiser enviar uma mensagem de voz, coloque o texto que deve ser falado entre as tags [ÁUDIO] e [/ÁUDIO].
Exemplo: "Entendi perfeitamente. [ÁUDIO] Vou te explicar como funciona essa parte... [/ÁUDIO] O que acha?".
NUNCA diga que é apenas um robô de texto ou que não consegue enviar áudio.`;

async function updatePrompts() {
  try {
    console.log('✅ Conectado ao banco de dados.');

    // 1. Buscar todos os agentes
    const agents = await sql`SELECT id, name, config FROM agents`;

    console.log(`🤖 Encontrados ${agents.length} agentes.`);

    for (const agent of agents) {
      let config = agent.config || {};
      let currentPrompt = config.systemPrompt || '';
      
      // Verificar se já tem a instrução
      if (currentPrompt.includes('[ÁUDIO]')) {
        console.log(`⏩ Agente "${agent.name}" já possui instrução de áudio. Pulando...`);
        continue;
      }

      config.systemPrompt = currentPrompt + AUDIO_INSTRUCTION;

      await sql`UPDATE agents SET config = ${config} WHERE id = ${agent.id}`;
      console.log(`✅ Config (Prompt) do Agente "${agent.name}" atualizado com sucesso!`);
    }

    console.log('🚀 Todos os prompts foram atualizados.');
  } catch (err) {
    console.error('❌ Erro ao atualizar prompts:', err);
  } finally {
    await sql.end();
  }
}

updatePrompts();
