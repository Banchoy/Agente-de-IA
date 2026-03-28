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
${agentConfig.prompt || "Inicie a conversa de forma amigável."}
"""

DADOS:
- Nome/Empresa Lead: ${targetName}
- Nicho: ${leadNiche}
- Fuso Horário de Referência: São Paulo, Brasil (Hora local: ${hour}h)
- Saudação correta para AGORA: ${timeOfDay}

TAREFA: 
Sua única função agora é gerar a PRIMEIRA MENSAGEM (Fase 1 / Etapa 1 / Abertura) que será enviada.
${temperature < 0.5 ? 
`- MODO DE ALTA PRECISÃO (Temperatura Baixa):
1. Procure no Roteiro acima pela "Etapa 1", "Fase 1" ou "Abertura".
2. Copie EXACTAMENTE o texto instruído para essa etapa.
3. Se o texto tiver variáveis de tempo (ex: "bom dia / boa tarde"), substitua pela correta ("${timeOfDay}").
4. CENSURA ABSOLUTA: NÃO adicione o nome da empresa, "tudo bem?" ou qualquer palavra não escrita expressamente no texto da etapa.
5. Entregue APENAS o texto copiado e adaptado para o horário. Sem aspas, sem "Mensagem:".` 
: 
`- MODO DINÂMICO:
Adapte a abertura (Fase 1) do roteiro, podendo adicionar uma breve saudação natural usando o nome do lead se julgar amigável, mas respeitando o objetivo inicial.`}
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
   * Retorna a "Instrução de Comportamento" para a IA baseado no estado atual.
   */
  getInstruction: (state: string) => {
    switch (state) {
      case "WAITING_REPLY":
        return "Fase de Introdução: Apresente-se como Tayná, diga que viu que trabalham com este nicho e que precisa de ajuda/orientação. Pergunte se pode explicar rapidinho.";
      case "INTRO":
        return "Fase de Contexto: Diga que estava olhando a empresa deles e viu coisas legais, mas identificou pontos de melhoria que trariam mais resultados. Foque na oportunidade.";
      case "CONTEXT":
        return "Fase de Direcionamento: Diga que organizou esses pontos em uma apresentação direta e quer apresentar para o responsável comercial. Pergunte se fala com a pessoa atual ou outra.";
      case "DECISION":
        return "Fase de Agendamento: Reforce que viu oportunidades de melhoria e quer mostrar em 10-15 min. Pergunte se faz sentido para o cliente.";
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
