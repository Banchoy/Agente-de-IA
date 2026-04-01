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
    const rawPhase = parseFloat(state) || 1;
    const currentPhase = Math.floor(rawPhase);
    const totalPhases = isOutbound ? 11 : 8;

    // Se a fase for de Mini Diagnóstico (9 no Outbound, 4 no Inbound)
    const isDiagnosis = (isOutbound && currentPhase === 9) || (!isOutbound && currentPhase === 4);
    
    // Identificar qual pergunta do diagnóstico estamos (se houver)
    let diagnosisTip = "";
    if (isDiagnosis) {
        const subPhase = Math.round((rawPhase - currentPhase) * 10);
        diagnosisTip = `\n- [ MINI DIAGNÓSTICO ]: Você está na PERGUNTA ${subPhase || 1} das perguntas listadas na Etapa/Fase ${currentPhase === 9 ? '9' : '4'}. Faça APENAS essa pergunta agora. Não avance para a próxima.`;
    }

    return `
### ATENÇÃO - STATUS DA CONVERSA:
Você está na **ETAPA / FASE ${currentPhase}** de ${totalPhases} do fluxo ${isOutbound ? "OUTBOUND" : "INBOUND"}.

### O QUE VOCÊ DEVE FAZER AGORA DE FORMA ESTRITA:
1. Encontre a "Fase ${currentPhase}" ou "Etapa ${currentPhase}" no ROTEIRO CUSTOMIZADO acima.
2. Formule sua resposta baseada ÚNICA E EXCLUSIVAMENTE nas diretrizes dessa etapa específica.${diagnosisTip}
3. CÓPIA LITERAL (REGRA DAS ASPAS): Se a etapa atual no roteiro possuir frases entre aspas simples ('') ou aspas duplas (""), sua resposta DEVE ser OBRIGATORIAMENTE uma cópia exata dessas frases. Não adicione "Oi" ou emojis se não estiverem nas aspas.
4. Se o cliente respondeu fora do assunto, seja sutilmente humanizado, mas volte rapidamente para o objetivo da Etapa ${currentPhase}.
    `.trim();
  },

  /**
   * Determina o próximo estado da conversa.
   */
  advanceState: (currentState: string, lead?: any) => {
    const isOutbound = lead?.source !== "WhatsApp (Inbound)";
    const rawPhase = parseFloat(currentState) || 1;
    const currentPhase = Math.floor(rawPhase);
    const maxPhase = isOutbound ? 11 : 8;

    // Lógica de Sub-fases para Mini Diagnóstico (Outbound Fase 9 - 3 perguntas)
    if (isOutbound && currentPhase === 9) {
        if (rawPhase < 9.3) {
            return (rawPhase + 0.1).toFixed(1);
        }
        return "10";
    }

    // Lógica de Sub-fases para Mini Diagnóstico (Inbound Fase 4 - 2 perguntas)
    if (!isOutbound && currentPhase === 4) {
        if (rawPhase < 4.2) {
            return (rawPhase + 0.1).toFixed(1);
        }
        return "5";
    }

    // Lógica de avanço simples por número para as outras fases
    if (currentPhase < maxPhase) {
        return (currentPhase + 1).toString();
    }

    return currentState;
  }
};
