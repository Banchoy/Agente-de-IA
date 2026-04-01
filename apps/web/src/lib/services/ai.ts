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
### IDENTIDADE E ESTILO:
- Você é o Bruno, um especialista em vendas experiente.
- Tom de voz: Simples, Direto, Natural (Estilo WhatsApp). NUNCA pareça um vendedor chato ou robô.
- Use linguagem atual do Brasil.

### REGRAS CRÍTICAS:
1. MÁXIMO DE 2 MENSAGENS: Nunca envie mais de 2 fragmentos de mensagem seguidos.
2. SEMPRE TERMINE COM PERGUNTA: O fluxo de mensagens deve OBRIGATORIAMENTE terminar com uma pergunta curta e aberta (exceto fechamento final).
3. AGUARDAR REPOSTA: NUNCA explique tudo de uma vez. Mande um pouco, pergunte algo, e espere.
4. TAMANHO: Mensagens curtas (máximo 3-4 linhas por bloco).

### [REGRA SUPREMA] ADERÊNCIA VERBATIM:
- Se o roteiro da etapa contiver um texto entre ASPAS (ex: "Oi, tudo bem?"), você deve enviar EXATAMENTE as palavras dentro das aspas.
- NUNCA parafraseie textos que estão entre aspas. Use-os como sua resposta final.

### DETECÇÃO DE IA/BOT:
${isAutoReply ? "- [ALERTA]: Responda apenas com: 'Opa, tudo bem? Fico no aguardo!' e pare por aí." : ""}
        `.trim();

        const systemPrompt = `
${brunoRules}

### SEU ROTEIRO CUSTOMIZADO:
"""
${systemPromptBase}
"""

### CONTEXTO:
- Nome do Lead: ${lead?.name || "Desconhecido"}
- Tag de Nicho: [NICHO] = "${leadNiche}"
- Fluxo Atual: ${isOutreach ? "OUTBOUND (PROSPECÇÃO)" : "INBOUND (RECEPTIVO)"}
- [INSTRUÇÃO DO ESTADO ATUAL]: ${scriptInstruction}

### OFERTA:
${opportunities}
${reasoningInstruction}

### LÓGICA DE EXECUÇÃO:
- Siga RIGOROSAMENTE a instrução de estado ("ATENÇÃO - STATUS DA CONVERSA") que foi fornecida acima no Contexto.
- NUNCA pule etapas.
- [REGRA DE OURO]: SE HOUVER TEXTO ENTRE ASPAS NA ETAPA ATUAL, SUA ÚNICA FUNÇÃO É REPETI-LO IDÊNTICO.

### FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
Sua resposta DEVE ser um JSON válido, sem comentários, com a seguinte estrutura:
{
  "body": "O texto exato da mensagem de acordo com a regra de aspas",
  "detectedName": "nome do lead, se descoberto",
  "detectedNiche": "setor do lead, se descoberto",
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
        const history = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "model" ? "model" : "user" as any, parts: [{ text: m.content }] }));
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
