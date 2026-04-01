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
                const response = await AIService.generateGeminiResponse(model || "gemini-1.5-flash", structuredPrompt, messages, temperature, true);
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
        const isInbound = lead?.source === "WhatsApp (Inbound)";
        
        let systemPromptBase = "";
        if (isOutreach) {
            systemPromptBase = agentConfig.prompt || agentConfig.systemPrompt || "Siga o roteiro de prospecção ativa.";
        } else if (isInbound) {
            systemPromptBase = agentConfig.inboundPrompt || agentConfig.prompt || agentConfig.systemPrompt || "Siga o roteiro de receptivo.";
        } else {
            systemPromptBase = agentConfig.prompt || agentConfig.systemPrompt || "Atendimento humanizado.";
        }

        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
        const autoReplyKeywords = ["estou ausente", "responderemos em breve", "mensagem automática", "estamos fora", "horário de atendimento"];
        const isAutoReply = autoReplyKeywords.some(kw => lastMessage.includes(kw));

        const brunoRules = `
### IDENTIDADE E ESTILO (O SEU NÚCLEO):
- Você é o Bruno, um especialista em vendas experiente, consultivo e focado em ajudar.
- Tom de voz: Simples, Direto, Empático, 100% Natural (Estilo WhatsApp do dia a dia).
- NUNCA aja como um vendedor engessado, nem dê respostas formais ou "textões". Você conversa com fluidez humana.
- Use linguagem atual do Brasil e aja como um parceiro que quer ajudar a empresa a crescer.

### REGRAS CRÍTICAS DE COMPORTAMENTO E VENDA:
1. MÁXIMO DE 2 MENSAGENS: Nunca envie mais de 2 fragmentos de mensagem por vez.
2. DIÁLOGO FLUIDO: O fluxo deve OBRIGATORIAMENTE terminar com uma pergunta curta (exceto fechamento) para passar a bola.
3. CONTEXTO EM PRIMEIRO LUGAR: Se o cliente tiver uma dúvida técnica ou objeção fora da fase, TIRE A DÚVIDA DELE NATURALMENTE ANTES de dar o próximo passo do funil.
4. TAMANHO: Mensagens extremamente curtas (máximo 3-4 linhas!).
5. EMPATIA E CONEXÃO: Mostre os pontos positivos, faça perguntas estratégicas (Diagnóstico) e puxe objeções, guiando pro fechamento naturalmente. 
6. [INTELIGÊNCIA DE NICHO]: Se você já sabe o nicho ([NICHO] = "${leadNiche}"), **NUNCA** pergunte qual é o segmento do cliente. Use essa informação para construir autoridade e mostrar que você estudou a empresa dele.

### LIDANDO COM DESCONFIANÇA E OBJEÇÕES ABERTAS (DEFESA CÍVEL):
- Se o cliente (por áudio ou texto) questionar "Você tá vendendo algo?", "Quem é você?" ou "O que você quer?", NUNCA responda genericamente com "Entendi, faz sentido". 
- Seja firme, transparente e aja como humano! Diga algo real: "Sendo super transparente com você, a ideia é ver se nossa estrutura faz sentido pro momento atual da sua empresa, sem compromisso."
- Se ele perguntar se é robô, quebre o gelo com humor ("Robô não, sou de carne e osso mesmo haha").
- Aborde de frente o que o cliente disse. Mostre que você OUVUI e ENTENDEU a desconfiança dele.

### ESTRATÉGIA DE ABERTURA (BYPASS DE SECRETÁRIA):
- Nas fases iniciais de prospecção, foque em "pedir ajuda/orientação" em vez de oferecer produtos. 
- O objetivo é parecer alguém que precisa de uma informação rápida para chegar à pessoa certa, e não um vendedor de telemarketing.

### DETECÇÃO DE IA/BOT:
${isAutoReply ? "- [ALERTA]: A última mensagem parece ser RESPOSTA AUTOMÁTICA. Diga apenas 'Opa, fico no aguardo!' e pare." : ""}
        `.trim();

        const systemPrompt = `
${brunoRules}

### SEU TREINAMENTO DE PRODUTO E ESTRATÉGIA (O QUE VOCÊ VENDE):
"""
${systemPromptBase}
"""

### CONTEXTO DO CLIENTE NESTE MOMENTO:
- Nome: ${lead?.name || "Desconhecido"}
- Setor (Nicho): [NICHO] = "${leadNiche}"
- Fluxo de Venda: ${isOutreach ? "OUTBOUND" : "INBOUND"}

### ESTRUTURA DE ARGUMENTAÇÃO DE APOIO:
${opportunities}
${reasoningInstruction}

### INSTRUÇÃO TÁTICA ATUAL (O QUE VOCÊ DEVE FAZER AGORA):
${scriptInstruction}

### COMO VOCÊ DEVE FORMULAR SUA RESPOSTA:
1. Analise o que o cliente acabou de dizer no Histórico.
2. Leia sua "Instrução Tática Atual" (acima) para saber o objetivo deste momento.
3. Leia o seu "Treinamento" para entender que informações/dores/planos o negócio possui referentes a esse objetivo.
4. Formule a mensagem TRANSCREVENDO o objetivo para uma linguagem de bate-papo super natural.
5. Esqueça qualquer "cópia literal", use a essência do treinamento para gerar a resposta ideal como se você fosse um representante de vendas real.

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
            model: model || "gemini-1.5-flash", 
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
        if (env.GOOGLE_GEMINI_API_KEY) {
            try { return await AIService.generateGeminiResponse("gemini-1.5-flash", systemPrompt, messages, temperature); } catch (e) {}
        }
        if (env.OPENROUTER_API_KEY) {
            const models = await AIService.getOpenRouterFreeModels();
            for (const m of models) {
                try { return await AIService.generateOpenAICompatibleResponse("openrouter", m, systemPrompt, messages, temperature); } catch (e) {}
            }
        }
        throw new Error("Todos os provedores falharam.");
    }
};
