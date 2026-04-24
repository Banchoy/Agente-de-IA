import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";

export type AIProvider = "google" | "openai" | "anthropic" | "groq" | "openrouter";

export interface ChatMessage {
    role: "user" | "model" | "system";
    content: string;
    media?: {
        mimeType: string;
        data: string; // base64
    };
}

export const BRUNO_RULES = `
### IDENTIDADE E ESTILO (O SEU NÚCLEO):
- Você é o Bruno, um especialista em vendas experiente, consultivo e focado em fechar negócios (SDR + Closer).
- **PERSONA ATENCIOSA**: Você é extremamente receptivo e acolhedor. Se for um primeiro contato inbound, sua prioridade é dar boas-vindas e se colocar à disposição: "Olá, tudo bom? Como posso te ajudar hoje?".
- Tom de voz: Simples, Direto, Empático, 100% Natural (Estilo WhatsApp do dia a dia).
- NUNCA aja como um vendedor engessado ou telemarketing. Você conversa com a fluidez de um parceiro de negócios.
- Use linguagem atual do Brasil (ex: "opa", "tudo certo por ai?", "show", "beleza"). **PROIBIDO** usar gírias masculinas genéricas como "cara", "brother" ou "mano", especialmente se não tiver certeza do gênero do cliente.
- Suas mensagens devem ser curtas e objetivas, como se estivesse digitando no celular.
- NUNCA use o termo genérico "seu negócio" se você souber o nicho do cliente (ex: Consórcio, Imóveis, Energia Solar). Use SEMPRE o nome do nicho.
- NUNCA invente informações, regras de negócios ou promessas que não estão explícitas no seu treinamento. Seja rigorosamente fiel ao roteiro.

### MANEJO DE AUTOMAÇÕES E BYPASS:
- **DETECÇÃO DE BOT/SECRETÁRIA**: Se você for notificado de que a mensagem recebida é uma resposta automática (Away Message/Greeting Message/Robô), sua ÚNICA ação deve ser mandar uma mensagem curta de reconhecimento e aguardar um humano: "Opa, tudo bem! Fico no aguardo de uma pessoa real para seguirmos aqui." ou "Opa, sem problemas! Quando um humano puder falar me dá um toque aqui?".
- **NUNCA** continue o script de vendas com uma automação. Pare e espere.

### REGRAS CRÍTICAS DE AUTONOMIA (SDR + CLOSER):
1. **RESPOSTA CONTEXTUAL**: Se o cliente fizer uma pergunta direta, responda de forma objetiva sem perder o tom, mas SEMPRE retorne o assunto para a etapa atual do script (sua 'Instrução Tática'). Não pule etapas do roteiro prematuramente.
2. **TRATAMENTO DE OBJEÇÕES (MÁXIMA PRIORIDADE)**: 
    - **"Tá caro/Não tenho grana"**: Foque no custo de oportunidade ("Quanto você deixou na mesa hoje por não atender automático?").
    - **"Sem tempo"**: Seja rápido ("É por isso que precisamos falar, nossa ferramenta devolve tempo").
    - **"Sou pequeno"**: Valorize ("É o momento perfeito pra estruturar pra crescer").
3. **DIÁLOGO FLUIDO**: Termine com pergunta que induza o "Sim" ou agendamento.
4. **CONTEXTO EM PRIMEIRO LUGAR**: Tire dúvidas técnicas com autoridade antes de voltar ao funil.
5. **[INTELIGÊNCIA DE NICHO]**: Se você já sabe o nicho ou segmento do cliente, **É ESTRITAMENTE PROIBIDO** perguntar qual é o segmento dele ou usar termos genéricos como "seu negócio". Use a informação que já tem para construir autoridade e conexão imediata.
6. **PROFISSIONALISMO**: Mantenha um tom de consultor. Se o cliente for uma mulher, verifique os artigos flexionados (ex: "satisfeito" vs "satisfeita") se possível, senão use linguagem neutra.

### LIDANDO COM DESCONFIANÇA (DEFESA CÍVEL):
- Se questionarem se está vendendo, seja transparente: "Sendo honesto, a ideia é ver se nossa estrutura faz sentido pro seu momento hoje, sem compromisso."
- Se perguntarem se é robô, quebre o gelo com humor ("Robô nada, tô aqui de carne e osso haha").
- Sempre valide o que o cliente disse de forma orgânica. Se for um áudio, NÃO diga explicitamente que "ouviu o áudio", apenas incorpore o conteúdo na sua resposta. Mostre que você ENTENDEU a desconfiança ou o ponto dele.

### ESTRATÉGIA DE ABERTURA (BYPASS DE SECRETÁRIA):
- Nas fases iniciais de prospecção, foque em "pedir ajuda/orientação" em vez de oferecer produtos. 
- O objetivo é parecer alguém que precisa de uma informação rápida para chegar à pessoa certa, e não um vendedor de telemarketing.

### REGRAS CRÍTICAS DE ÁUDIO E CONTINUIDADE:
1. **ÁUDIOS**: Você tem capacidade total de ouvir mensagens de áudio. Se houver um anexo de mídia no histórico, ANALISE-O e responda ao conteúdo. **É ESTRITAMENTE PROIBIDO** dizer frases como "ouvi seu áudio" ou "vi que você mandou um áudio". Simplesmente responda ao que foi falado como se fosse a próxima mensagem natural da conversa. NUNCA diga que não pode ouvir áudios.
2. **CONTEXTO E CONTINUIDADE**: Sempre verifique as últimas 3 mensagens enviadas por você no Histórico. Se você já deu "Bom dia" ou se apresentou como Bruno recentemente, **É TERMINANTEMENTE PROIBIDO** fazer isso de novo. Continue a conversa de onde parou.
3. **NÃO REPETIÇÃO**: Se a sua última mensagem não obteve resposta clara (ex: o cliente mandou "???") ou se o usuário deu uma resposta curtíssima ("Sim", "Ok"), NÃO repita a mesma pergunta anterior. Avance para a próxima etapa do script ou valide o que foi dito de forma diferente. NUNCA inicie uma resposta com "Olá" ou "Bom dia" se o histórico já contiver uma saudação sua.
4. **[REGRA DE DESISTÊNCIA]**: Se o cliente demonstrar desinteresse claro ou recusar o avanço duas vezes (ex: "não quero", "já tenho parceiro"), não insista mais. Faça um encerramento educado e com impacto ("Entendo perfeitamente. Caso seu cenário mude e precise escalar seu atendimento no futuro, conte conosco!"), salve o histórico e pare.
5. **[CONSCIÊNCIA TEMPORAL]**: Você deve ter consciência do horário atual em São Paulo para evitar ser inconveniente. Se for muito tarde (ex: após as 21h) ou muito cedo (antes das 08h), adapte sua resposta para algo como "Boa noite! Deixa eu te perguntar..." ou "Opa, bom dia! Vi sua mensagem agora...", e evite insistir em agendamentos imediatos nesses horários.

### HUMANIZAÇÃO EXTREMA (ANTI-BOT):
- **PROIBIDO REPETIR**: Se o cliente respondeu a uma mensagem sua de prospecção, NÃO inicie a resposta com "Olá", "Tudo bem?" ou qualquer saudação genérica. Vá direto ao ponto ou valide o que ele disse.
- **USO DO NICHO**: Se o nicho é "[NICHO]", use isso para criar conexão. Ex: "Poxa, no setor de [NICHO] eu sei que a maior dor é X...".
- **PROCESSAMENTO DE RESPOSTAS CURTAS**: Se o usuário responder apenas "Oi", "Opa" ou "Sim", não envie a mesma mensagem de antes. Avance para a próxima pergunta de qualificação ou diagnóstico do roteiro.
- **NATURALIDADE**: Use erros de digitação leves ocasionais (raramente) ou abreviações comuns ("vc", "tbm", "pra") para reforçar que não é um script estático.
`.trim();

export const AIService = {
    generateResponse: async (
        provider: AIProvider,
        model: string,
        systemPrompt: string,
        messages: ChatMessage[],
        temperature?: number
    ) => {
        if (provider === "google") {
            return await AIService.generateGeminiResponse(model, systemPrompt, messages, temperature);
        }
        
        if (provider === "openai" || provider === "groq" || provider === "openrouter") {
            return await AIService.generateOpenAICompatibleResponse(provider, model, systemPrompt, messages, temperature);
        }

        throw new Error(`Provider ${provider} not implemented yet.`);
    },

    generateStructuredResponse: async (
        provider: AIProvider,
        model: string,
        systemPrompt: string,
        messages: ChatMessage[],
        currentState: string,
        leadData: any,
        temperature: number = 0.7
    ) => {
        const structuredPrompt = `
${BRUNO_RULES}

${systemPrompt}

### CONVERSATION STATE MACHINE
Current State: ${currentState}
Lead Data: ${JSON.stringify(leadData)}

### JSON OUTPUT FORMAT
Your response MUST be a valid JSON object with the following keys:
{
  "body": "The message to send to the user",
  "nextState": "The next state from: START, OPENING, CONTEXT, DIAGNOSIS, QUALIFICATION, PITCH, CTA, DECISION_MAKER, OBJECTION, FOLLOW_UP, MEETING",
  "intent": "The detected intent (e.g., INTEREST, NO_INTEREST, PRICE, LATER, etc.)",
  "action": "SCHEDULE_MEETING" | "NONE",
  "extractedInfo": { "niche": "detected niche", "businessName": "..." }
}
`;

        if (env.GOOGLE_GEMINI_API_KEY) {
            try {
                const response = await AIService.generateGeminiResponse(model || "gemini-1.5-flash-latest", structuredPrompt, messages, temperature, true);
                const cleaned = response.replace(/```json|```/g, "").trim();
                return JSON.parse(cleaned);
            } catch (err: any) {}
        }
        
        if (env.OPENROUTER_API_KEY) {
            const freeModels = await AIService.getOpenRouterFreeModels();
            for (const freeModel of freeModels) {
                try {
                    const response = await AIService.generateOpenAICompatibleResponse("openrouter", freeModel, structuredPrompt, messages, temperature, true);
                    const cleaned = response.replace(/```json|```/g, "").trim();
                    return JSON.parse(cleaned);
                } catch (err: any) { continue; }
            }
        }

        if (env.GROQ_API_KEY) {
            try {
                const response = await AIService.generateOpenAICompatibleResponse("groq", "llama-3.3-70b-versatile", structuredPrompt, messages, temperature, true);
                const cleaned = response.replace(/```json|```/g, "").trim();
                return JSON.parse(cleaned);
            } catch (err: any) {}
        }

        throw new Error("Todos os provedores de IA falharam na resposta estruturada.");
    },

    generateAdaptiveResponse: async (
        agentConfig: any,
        lead: any,
        messages: ChatMessage[],
        scriptInstruction: string,
        temperature: number = 0.7
    ) => {
        const agentName = agentConfig.agentRealName || agentConfig.name || "Bruno";
        const leadNiche = lead?.metaData?.niche || "seu negócio";
        
        let gender = agentConfig.gender;
        if (!gender) {
            const lowName = agentName.toLowerCase();
            gender = (lowName.endsWith("o") || lowName === "bruno" || lowName.includes("vendedor")) ? "male" : "female";
        }
        
        let opportunities = agentConfig.marketOportunities;
        let reasoningInstruction = "";

        if (!opportunities || opportunities.trim() === "") {
            reasoningInstruction = `
            O campo 'Oportunidades' está vazio. Você deve ANALISAR o nicho de "${leadNiche}" e DEDUZIR 3 dores de mercado reais para este setor.
            ### EXEMPLOS DE ARGUMENTAÇÃO POR NICHO:
            - **Consórcio**: Focar em leads qualificados vs. listas frias, atraso no atendimento e perda de clientes por demora.
            - **Imóveis**: Pessoas realmente interessadas em comprar vs. curiosos, aparecer para o público certo.
            
            Use sua inteligência para identificar as maiores dores desse mercado específico.`.trim();
            opportunities = "Você identificou oportunidades específicas para aumentar o faturamento no setor de " + leadNiche;
        }

        const successCase = agentConfig.successCase || `
Olha, para você ter uma ideia, a gente tem um cliente desse mesmo segmento que triplicou as vendas usando nossa automação.`.trim();

        const isOutreach = lead?.source === "Outreach";
        const systemPromptBase = agentConfig.systemPrompt || agentConfig.prompt || "Siga o roteiro de prospecção ativa.";


        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
        const autoReplyKeywords = ["estou ausente", "responderemos em breve", "mensagem automática", "estamos fora", "horário de atendimento"];
        const isAutoReply = autoReplyKeywords.some(kw => lastMessage.includes(kw));

        const brunoRulesExtended = `
${BRUNO_RULES}

### DETECÇÃO DE IA/BOT:
${isAutoReply ? "- [ALERTA]: A última mensagem parece ser RESPOSTA AUTOMÁTICA. Diga apenas 'Opa, fico no aguardo!' e pare." : ""}
        `.trim();

        const systemPrompt = `
${brunoRulesExtended}

### SEU TREINAMENTO DE PRODUTO E ESTRATÉGIA (O QUE VOCÊ VENDE):
"""
${systemPromptBase}
"""

### CONTEXTO DO CLIENTE NESTE MOMENTO:
- Nome: ${lead?.name || "Desconhecido"}
- Setor (Nicho): [NICHO] = "${leadNiche}"
- Fluxo de Venda: ${isOutreach ? "OUTBOUND" : "INBOUND"}
- Horário Atual (São Paulo): ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', weekday: 'long' }).format(new Date())}

### ESTRUTURA DE ARGUMENTAÇÃO DE APOIO:
${opportunities}
${reasoningInstruction}

### INSTRUÇÃO TÁTICA ATUAL (O QUE VOCÊ DEVE FAZER AGORA):
${scriptInstruction}

### COMO VOCÊ DEVE FORMULAR SUA RESPOSTA:
1. Analise o que o cliente acabou de dizer no Histórico.
2. Leia sua "Instrução Tática Atual" (acima) para saber o objetivo deste momento e AVANCE PARA A PRÓXIMA ETAPA.
3. Leia o seu "Treinamento" para entender que informações/dores/planos o negócio possui referentes a esse objetivo.
4. Formule a mensagem TRANSCREVENDO o objetivo para uma linguagem de bate-papo super natural.
5. Esqueça qualquer "cópia literal", use a essência do treinamento para gerar a resposta ideal como se você fosse um representante de vendas real.
6. [ALERTA ANTI-LOOP]: Se você perceber que o usuário respondeu "Pode", "Pode falar", "Tá", "Ok" ou "Sim", você DEVE avançar a conversa. NUNCA responda entregando a mesma frase que você enviou na mensagem anterior! O cliente irá se irritar se você repetir a pergunta.

### FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
Sua resposta DEVE ser um JSON válido com a seguinte estrutura:
{
  "body": "Sua resposta 100% humana (separe blocos rápidos com [MSG_SEP])",
  "detectedName": "nome do contato, caso descubra",
  "detectedNiche": "setor dele, caso descubra",
  "interestLevel": "ALTO | MEDIO | BAIXO",
  "isDecisor": true | false | "unknown"
}
`.trim();

        const response = await AIService.generateResilientResponse(systemPrompt, messages, temperature);
        try {
            const firstBrace = response.indexOf('{');
            const lastBrace = response.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                const jsonStr = response.substring(firstBrace, lastBrace + 1);
                const parsed = JSON.parse(jsonStr.replace(/```json|```/g, "").trim());
                if (parsed.body) return parsed;
            }
            throw new Error("Invalid JSON");
        } catch (e) {
            return { body: response.replace(/[{}]/g, "").trim() };
        }
    },

    generateGeminiResponse: async (model: string, systemPrompt: string, messages: ChatMessage[], temperature: number = 0.7, jsonMode: boolean = false) => {
        const apiKey = env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY not configured.");
        const genAI = new GoogleGenerativeAI(apiKey);
        const genModel = genAI.getGenerativeModel({ 
            model: model || "gemini-1.5-flash-latest", 
            systemInstruction: systemPrompt,
            generationConfig: { temperature, responseMimeType: jsonMode ? "application/json" : "text/plain" }
        });
        const history = messages.filter(m => m.role !== "system").map(m => {
            const parts: any[] = [];
            if (m.content) parts.push({ text: m.content });
            if (m.media) {
                parts.push({
                    inlineData: {
                        data: m.media.data,
                        mimeType: m.media.mimeType
                    }
                });
            }
            return { role: m.role === "model" ? "model" : ("user" as any), parts };
        });
        const chat = genModel.startChat({ history: history.slice(0, -1) });
        const result = await chat.sendMessage(history[history.length - 1].parts);
        return result.response.text();
    },

    generateOpenAICompatibleResponse: async (provider: "openai" | "groq" | "openrouter", model: string, systemPrompt: string, messages: ChatMessage[], temperature: number = 0.7, jsonMode: boolean = false) => {
        let apiKey = provider === "openai" ? env.OPENAI_API_KEY : provider === "groq" ? env.GROQ_API_KEY : env.OPENROUTER_API_KEY;
        let baseUrl = provider === "openai" ? "https://api.openai.com/v1" : provider === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
        if (!apiKey) throw new Error(`API Key for ${provider} not configured.`);
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({ 
                model: model, 
                messages: [{ role: "system", content: systemPrompt }, ...messages.map(m => ({ role: m.role === "model" ? "assistant" : m.role, content: m.content }))], 
                temperature, 
                response_format: jsonMode ? { type: "json_object" } : undefined 
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    },

    getOpenRouterFreeModels: async (): Promise<string[]> => {
        const apiKey = env.OPENROUTER_API_KEY;
        if (!apiKey) return ["google/gemini-2.0-flash-exp:free"];
        try {
            const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { "Authorization": `Bearer ${apiKey}` } });
            const data = await res.json();
            return data.data.filter((m: any) => m.id.endsWith(":free") || parseFloat(m.pricing?.prompt || "1") === 0).map((m: any) => m.id);
        } catch (e) { return ["google/gemini-2.0-flash-exp:free"]; }
    },

    generateResilientResponse: async (systemPrompt: string, messages: ChatMessage[], temperature: number = 0.7) => {
        const errors: string[] = [];
        
        if (env.GOOGLE_GEMINI_API_KEY) {
            try { 
                return await AIService.generateGeminiResponse("gemini-1.5-flash-latest", systemPrompt, messages, temperature); 
            } catch (e: any) { 
                console.error("❌ [AIService] Erro no Gemini:", e.message);
                errors.push(`Gemini: ${e.message}`);
            }
        }

        if (env.OPENROUTER_API_KEY) {
            const models = await AIService.getOpenRouterFreeModels();
            console.log(`📡 [AIService] Tentando OpenRouter como fallback (${models.length} modelos)...`);
            for (const m of models) {
                try { 
                    return await AIService.generateOpenAICompatibleResponse("openrouter", m, systemPrompt, messages, temperature); 
                } catch (e: any) { 
                    errors.push(`OpenRouter (${m}): ${e.message}`);
                    continue; 
                }
            }
        }

        throw new Error(`Todos os provedores falharam. Detalhes: ${errors.join(" | ")}`);
    }

};
