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
   * Retorna a "Instrução de Comportamento" para a IA baseado nas etapas do roteiro.
   */
  getInstruction: (state: string, lead?: any) => {
    const isOutreach = lead?.source !== "WhatsApp (Inbound)";
    
    // Mapeamento dinâmico para as etapas do prompt do usuário
    const stageMap: Record<string, string> = {
      "WAITING_REPLY": isOutreach ? "Etapa 2️⃣: CONTEXTO" : "Etapa 1️⃣: ABERTURA",
      "INTRO": "Etapa 2️⃣: CONTEXTO",
      "CONTEXT": "Etapa 3️⃣: OBSERVAÇÃO",
      "DIAGNOSIS": "Etapa 4️⃣: PERGUNTA DIAGNÓSTICA",
      "VALIDATION": "Etapa 5️⃣: VALIDAÇÃO",
      "POSITIONING": "Etapa 6️⃣: POSICIONAMENTO",
      "OPPORTUNITY": "Etapa 7️⃣: OPORTUNIDADE",
      "CTA": "Etapa 8️⃣: CHAMADA PARA AÇÃO"
    };

    const currentStage = stageMap[state] || "Próxima Etapa Lógica";

    return `Siga RIGOROSAMENTE o roteiro fornecido. Você deve executar agora o conteúdo da: ${currentStage}.
    REGRA DE NICHO: Se o nicho do lead for Consórcio, adapte a etapa de OBSERVAÇÃO seguindo o padrão usado para os outros setores no roteiro.`.trim();
  },

  /**
   * Determina o próximo estado da conversa.
   */
  advanceState: (currentState: string) => {
    switch (currentState) {
      case "WAITING_REPLY": return "INTRO";
      case "INTRO": return "CONTEXT";
      case "CONTEXT": return "DIAGNOSIS";
      case "DIAGNOSIS": return "VALIDATION";
      case "VALIDATION": return "POSITIONING";
      case "POSITIONING": return "OPPORTUNITY";
      case "OPPORTUNITY": return "CTA";
      case "CTA": return "DECISION_MAKER";
      default: return currentState;
    }
  }
};
