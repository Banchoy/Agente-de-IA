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
    
    const systemPrompt = `
Você é um agente de vendas conversando pelo WhatsApp.
Sua configuração principal (Prompt do Usuário) dita como você deve agir:
"""
${agentConfig.prompt || "Inicie a conversa de forma amigável."}
"""

DADOS DO LEAD:
- Nome/Empresa: ${targetName}
- Nicho: ${leadNiche}

TAREFA: 
Gere a PRIMEIRA MENSAGEM que você irá enviar para este lead no WhatsApp.
- Leia o "Prompt do Usuário" assiduamente.
- Se o prompt definir "Fases" ou "Etapas", esta é a FASE 1 (Abertura). Você NÃO DEVE avançar ou misturar o texto das Fases seguintes.
- REGRA DE OURO (MUITO IMPORTANTE): Se o "Prompt do Usuário" instruir explicitamente qual DEVE ser a fala (ex: "Sempre inicie com 'Olá, tudo bem?'" ou "Na etapa 1 envie apenas 'Olá, bom dia'"), VOCÊ DEVE ESCREVER LITERALMENTE APENAS ISSO. Não adicione o nome da pessoa, não adicione o nome da empresa, não coloque emojis que não estão no script.
- Nível de Criatividade (${temperature}): ${temperature < 0.5 ? "Siga as falas entre aspas do roteiro IPSIS LITTERIS. A obediência ao texto da Fase 1 deve ser cega, sem floreios." : "Adapte a quebra-gelo, mas sem desviar do roteiro base."}
- NÃO escreva "Mensagem:" ou coloque aspas, retorne APENAS o texto puro que será disparado.
`.trim();

    try {
        const result = await AIService.generateResilientResponse(systemPrompt, [], 0.7);
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
