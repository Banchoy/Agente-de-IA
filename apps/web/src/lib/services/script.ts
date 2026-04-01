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
    const isOutbound = lead?.source !== "WhatsApp (Inbound)";
    const currentPhase = parseInt(state) || 1;
    const totalPhases = isOutbound ? 11 : 8;

    // Se a fase for de Mini Diagnóstico (9 no Outbound, 4 no Inbound)
    const isDiagnosis = (isOutbound && currentPhase === 9) || (!isOutbound && currentPhase === 4);

    return `
    ### ESTADO DA CONVERSA:
    Fase Atual: ${currentPhase} de ${totalPhases}
    Tipo de Fluxo: ${isOutbound ? "OUTBOUND (PRÓ-ATIVO)" : "INBOUND (RECEPTIVO)"}
    
    ### INSTRUÇÃO:
    - Verifique no seu roteiro o conteúdo da "Fase ${currentPhase}".
    - Você deve agora executar exatamente o objetivo dessa fase.
    ${isDiagnosis ? "- [ MINI DIAGNÓSTICO ]: Faça UMA PERGUNTA POR VEZ no final da mensagem. Não avance para a próxima fase do roteiro até que todas as perguntas do diagnóstico sejam concluídas." : ""}
    - Se o cliente responder algo fora do assunto, responda de forma humanizada e tente voltar para o objetivo da "Fase ${currentPhase}".
    `.trim();
  },

  /**
   * Determina o próximo estado da conversa.
   */
  advanceState: (currentState: string, lead?: any) => {
    const isOutbound = lead?.source !== "WhatsApp (Inbound)";
    const currentPhase = parseInt(currentState) || 1;
    const maxPhase = isOutbound ? 11 : 8;

    // Lógica de avanço simples por número
    if (currentPhase < maxPhase) {
        return (currentPhase + 1).toString();
    }

    return currentState;
  }
};
