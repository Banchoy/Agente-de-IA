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
    const isOutbound = lead?.source === "Outreach" || lead?.source === "Google Maps";

    // Identificar o período do dia para saudações usando o fuso horário de São Paulo
    const spTime = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const hour = new Date(spTime).getHours();
    const timeOfDay = hour < 12 ? "bom dia" : hour < 18 ? "boa tarde" : "boa noite";

    // REGRA DE OURO: Para Outbound, o primeiro passo é SEMPRE uma saudação curta e SEM NOME.
    if (isOutbound) {
        const greetings = [
            `Olá, ${timeOfDay}, tudo bem?`,
            `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}, tudo bem?`,
            `Olá, tudo bem?`,
            `Oi, ${timeOfDay}, tudo certo por aí?`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
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
    const isOutbound = lead?.source === "Outreach" || lead?.source === "Google Maps";
    const rawPhase = parseFloat(state) || 1;
    const currentPhase = Math.floor(rawPhase);
    const totalPhases = isOutbound ? 11 : 8;
    const leadNiche = lead?.metaData?.niche || "seu negócio";

    // --- ESTRATÉGIA DE ABERTURA DESARMADA (OUTBOUND FASES 1-3) ---
    if (isOutbound) {
        if (currentPhase === 1) {
            return `### OBJETIVO: APENAS SAUDAÇÃO.
            Você acabou de enviar "Olá, tudo bem?". Se o cliente respondeu, seu único objetivo agora é ir para a FASE 2.`;
        }
        if (currentPhase === 2) {
            return `### OBJETIVO: PEDIR ORIENTAÇÃO (ESTRATÉGIA DESARMADA)
            1. Se apresente (Bruno da DreamStore).
            2. Use o nicho: "Vi que você trabalha com ${leadNiche} e preciso de uma ajuda sua...".
            3. Use o gancho: "Não sei se é com você mesmo que consigo essa orientação... posso te explicar rapidinho?".
            4. FOCO: Não tente vender nada ainda. Apenas peça a permissão para explicar.`;
        }
        if (currentPhase === 3) {
            return `### OBJETIVO: APRESENTAR ANÁLISE E VALOR
            1. Valide o "posso" do cliente.
            2. "Tava analisando a empresa de vocês e vi que fazem coisas legais para captar clientes para ${leadNiche}...".
            3. O Problema: "Mas notei pontos onde vocês estão perdendo faturamento...".
            4. A Solução: "Preparei um material com esses pontos e gostaria de apresentar para o responsável".
            5. Finalize perguntando quem seria essa pessoa ou se ele mesmo cuida dessa parte comercial.`;
        }
    }

    const isDiagnosis = (isOutbound && currentPhase === 9) || (!isOutbound && currentPhase === 4);
    
    let diagnosisTip = "";
    if (isDiagnosis) {
        const subPhase = Math.round((rawPhase - currentPhase) * 10);
        diagnosisTip = `\n- [ MINI DIAGNÓSTICO ]: Você está na PERGUNTA ${subPhase || 1} do diagnóstico. Faça APENAS essa pergunta agora de forma natural. Aguarde a resposta do cliente antes de fazer outra pergunta.`;
    }

    return `
### O SEU OBJETIVO NESTE EXATO MOMENTO:
Você está na **ETAPA / FASE ${currentPhase}** de ${totalPhases}.
1. Leia a diretriz da "Fase ${currentPhase}" no SEU TREINAMENTO (acima).
2. Compreenda o OBJETIVO dessa fase e formule sua resposta para alcançá-lo.
3. ADAPTAÇÃO HUMANA: Não leia o treinamento como um robô. Use as informações como base e escreva sua mensagem de forma empática, contextualizada com o que o cliente acabou de dizer.${diagnosisTip}
4. Se o cliente tiver feito uma pergunta técnica ou saído do script, tire a dúvida dele PRIMEIRO com máxima presteza. Só depois volte ao fluxo natural.
5. [REGRA DE OURO]: Se você já sabe o NICHO ([NICHO] = "${leadNiche}"), NUNCA pergunte qual é o segmento do cliente. Use essa informação para construir autoridade.
    `.trim();
  },

  /**
   * Determina o próximo estado da conversa.
   */
  advanceState: (currentState: string, lead?: any, aiResult?: any) => {
    const isOutbound = lead?.source === "Outreach" || lead?.source === "Google Maps";
    const rawPhase = parseFloat(currentState) || 1;
    const currentPhase = Math.floor(rawPhase);
    const maxPhase = isOutbound ? 11 : 8;

    // --- AUTONOMIA: SALTO DE ESTADO POR INTENÇÃO ---
    // Se a IA detectar que o cliente quer agendar ou tem alto interesse, pula direto pro CTA/MEETING
    if (aiResult?.action === "SCHEDULE_MEETING" || aiResult?.nextState === "MEETING" || (aiResult?.interestLevel === "ALTO" && currentPhase < 7)) {
        console.log(`🚀 [ScriptService] Salto de estado detectado: ${currentState} -> CTA/MEETING`);
        return isOutbound ? "11" : "8"; // Vai para a fase de fechamento
    }

    // Lógica de Sub-fases para Mini Diagnóstico (Outbound Fase 9)
    if (isOutbound && currentPhase === 9) {
        if (rawPhase < 9.3) return (rawPhase + 0.1).toFixed(1);
        return "10";
    }

    // Lógica de Sub-fases para Mini Diagnóstico (Inbound Fase 4)
    if (!isOutbound && currentPhase === 4) {
        if (rawPhase < 4.2) return (rawPhase + 0.1).toFixed(1);
        return "5";
    }

    // Lógica de avanço simples
    if (currentPhase < maxPhase) {
        return (currentPhase + 1).toString();
    }

    return currentState;
  }
};
