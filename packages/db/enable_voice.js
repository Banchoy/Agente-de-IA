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

async function enableVoiceForAll() {
  try {
    console.log('✅ Conectado ao banco de dados.');

    // 1. Buscar todos os agentes
    const agents = await sql`SELECT id, name, config FROM agents`;

    console.log(`🤖 Encontrados ${agents.length} agentes.`);

    for (const agent of agents) {
      let config = agent.config || {};
      
      // Forçar voz habilitada e provedor Piper
      config.voiceEnabled = true;
      config.ttsProvider = 'piper';
      
      // Preservar systemPrompt se existir, senão o script anterior já deve ter rodado
      if (!config.systemPrompt) {
          config.systemPrompt = "Você é um assistente virtual experiente que ajuda clientes. Você PODE enviar áudios reais! Sempre que quiser enviar uma mensagem de voz, coloque o texto que deve ser falado entre as tags [ÁUDIO] e [/ÁUDIO].";
      }

      await sql`UPDATE agents SET config = ${config} WHERE id = ${agent.id}`;
      console.log(`✅ Voz habilitada (Piper) para o Agente "${agent.name}".`);
    }

    console.log('🚀 Todos os agentes foram configurados para voz.');
  } catch (err) {
    console.error('❌ Erro ao habilitar voz:', err);
  } finally {
    await sql.end();
  }
}

enableVoiceForAll();
