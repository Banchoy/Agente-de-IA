import { AIService } from "./ai";

export const ScriptService = {
  getInitialMessage: async (agentConfig: any, lead: any) => {
    // 1. Template explícito vindo da prospecção
    if (lead?.metaData?.initialMessage) {
        let msg = lead.metaData.initialMessage;
        const firstName = lead.name ? lead.name.split(" ")[0] : "";
        return msg.replace(/\{nome\}/gi, firstName || "");
    }

    // 2. IA Gerando saudação dinamicamente com base no 'prompt' do agente
    const leadNiche = lead?.metaData?.niche || "seu negócio";
    const targetName = lead?.name?.split(" ")[0] || "";
    const temperature = agentConfig.temperature !== undefined ? parseFloat(agentConfig.temperature) : 0.7;

    // Identificar o período do dia para saudações usando o fuso horário de São Paulo
    const spTime = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const hour = new Date(spTime).getHours();
    const timeOfDay = hour < 12 ? "bom dia" : hour < 18 ? "boa tarde" : "boa noite";
    
    const systemPrompt = `
Você é um agente de vendas pelo WhatsApp seguindo um roteiro ESTRITO.
Configuração do Agente (Roteiro):
"""
${agentConfig.prompt || agentConfig.systemPrompt || "Inicie a conversa de forma amigável."}
"""

DADOS:
- Tag de Nicho (CRM): [NICHO] = "${leadNiche}"
- Fuso Horário de Referência: São Paulo, Brasil (Hora local: ${hour}h)
- Saudação correta para AGORA: ${timeOfDay}

TAREFA: 
Sua única função agora é gerar a PRIMEIRA MENSAGEM (Fase 1 / Etapa 1 / Abertura) que será enviada.

[REGRAS CRÍTICAS DE NICHO]:
- Sempre que se referir ao setor ou negócio do cliente no seu texto, utilize obrigatoriamente o termo definido na tag [NICHO]: "${leadNiche}".
- Trate este termo como a principal variável de conexão com o cliente.

${temperature < 0.5 ? 
`- MODO DE ALTA PRECISÃO (Temperatura Baixa):
1. Procure no Roteiro acima pela "Etapa 1", "Fase 1" ou "Abertura".
2. Copie EXACTAMENTE o texto instruído para essa etapa.
3. Se o texto tiver variáveis de tempo (ex: "bom dia / boa tarde"), substitua pela correta ("${timeOfDay}").
4. CENSURA ABSOLUTA: NÃO adicione o nome da empresa, "tudo bem?" ou qualquer palavra não escrita expressamente no texto da etapa.
5. Entregue APENAS o texto copiado e adaptado para o horário. Sem aspas, sem "Mensagem:".` 
: 
`- MODO DINÂMICO:
Adapte a abertura (Fase 1) do roteiro de forma humanizada. 
Use a informação do [NICHO] ("${leadNiche}") para mostrar que você conhece o setor dele.`}
`.trim();

    try {
        const result = await AIService.generateResilientResponse(systemPrompt, [], temperature);
        let cleaned = result.replace(/```json|```/g, "").trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1);
        }
        return cleaned;
    } catch (e) {
        console.error("Erro ao gerar mensagem inicial via IA, usando fallback:", e);
        return targetName ? `Oi ${targetName}, tudo bem?` : "Oi, tudo bem?";
    }
  },

   /**
   * Retorna a "Instrução de Comportamento" para a IA baseado no estado atual e origem do lead.
   */
  getInstruction: (state: string, lead?: any) => {
    const isOutreach = lead?.source !== "WhatsApp (Inbound)";
    const niche = lead?.metaData?.niche || "este segmento";

    switch (state) {
      case "WAITING_REPLY":
        if (isOutreach) {
          return `Fase de Introdução (PROSPECÇÃO): Apresente-se, diga que viu que trabalham com "${niche}" e que precisa de ajuda/orientação rápida, mas não sabe se é com ele mesmo. Pergunte se pode explicar rapidinho.`;
        }
        return `Fase de Abertura (INBOUND): Agradeça o contato, pergunte o nome da pessoa (se não souber) e qual o segmento/nicho de atuação deles hoje para entender como ajudar.`;
      
      case "INTRO":
        return `Fase de Contexto: Diga que estava olhando a empresa deles/perfil e viu que eles fazem um bom trabalho no setor de "${niche}", mas identificou pontos de melhoria que trariam muito mais resultados. Foque na oportunidade.`;
      
      case "CONTEXT":
        return `Fase de Direcionamento: Diga que organizou esses pontos em uma apresentação direta de 10-15 min e quer apresentar para o responsável comercial. Pergunte se fala com a pessoa atual ou outra.`;
      
      case "DECISION":
        return "Fase de Agendamento: Reforce que as oportunidades detectadas podem triplicar os resultados deles e que quer mostrar como isso funciona. Pergunte qual o melhor dia/horário para uma call rápida.";
      
      default:
        return "Converse naturalmente para qualificar o lead e agendar uma reunião.";
    }
  },

  /**
   * Determina o próximo estado da conversa.
   */
  advanceState: (currentState: string) => {
    switch (currentState) {
      case "WAITING_REPLY": return "INTRO";
      case "INTRO": return "CONTEXT";
      case "CONTEXT": return "DECISION";
      case "DECISION": return "MEETING";
      default: return currentState;
    }
  }
};
