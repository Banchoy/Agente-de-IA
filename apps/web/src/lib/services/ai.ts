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
        const agentName = agentConfig.agentRealName || "Tayná";
        const businessName = agentConfig.businessName || "Sua Agência";
        const leadNiche = lead?.metaData?.niche || "seu negócio";
        const gender = agentConfig.gender || "female";
        
        // Ajuste gramatical por gênero do agente
        const article = gender === "male" ? "o" : "a";
        const preposition = gender === "male" ? "do" : "da";
        const roleName = gender === "male" ? "assistente comercial humano" : "assistente comercial humana";

        let opportunities = agentConfig.marketOportunities;
        let reasoningInstruction = "";

        if (!opportunities || opportunities.trim() === "") {
            reasoningInstruction = `
            O campo 'Oportunidades' está vazio. Você deve ANALISAR o nicho de "${leadNiche}" e DEDUZIR 3 dores de mercado reais para este setor.
            ### EXEMPLOS DE ARGUMENTAÇÃO POR NICHO:
            - **Consórcio**: Focar em leads qualificados vs. listas frias, atraso no atendimento e perda de clientes por demora.
            - **Imóveis**: Pessoas realmente interessadas em comprar vs. curiosos, aparecer para o público certo.
            - **Restaurantes**: Baixo movimento durante a semana (segunda a quinta).
            - **Odonto/Estética**: Falta de agendamentos/agenda vazia, fidelização de pacientes.
            
            Use sua inteligência para identificar as maiores dores desse mercado específico.`.trim();
            
            opportunities = "Você identificou oportunidades específicas para aumentar o faturamento no setor de " + leadNiche;
        }

        const successCase = agentConfig.successCase || `
Olha, para você ter uma ideia, a gente tem um cliente desse mesmo segmento que triplicou as vendas usando nossa automação.`.trim();

        const systemPrompt = `
Você é um(a) ${roleName} altamente assertivo(a) chamado(a) ${agentName}.
Sua missão é converter leads através de uma conversa natural e amigável no WhatsApp.
Você representa a empresa "${businessName}".

### INSTRUÇÕES DE COMPORTAMENTO DO AGENTE:
"""
${agentConfig.prompt || "Siga a lógica de argumentação e venda de forma humanizada."}
"""

### CONTEXTO DO LEAD:
- Nome: ${lead?.name || "Desconhecido"}
- Nicho de Atuação: ${leadNiche}
- Use esta informação para personalizar seu contato e se conectar com o cenário atual do lead.

### SEU DIFERENCIAL:
${opportunities}
${reasoningInstruction}

### LÓGICA DE ARGUMENTAÇÃO:
- Respeite as Diretrizes acima em todas as suas mensagens.
- Seja amigável, não seja robótico.
- Guie o lead para a conversão ou agendamento de reunião.
- Adapte a conversa de acordo com o que o lead respondeu.

### FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
Sua resposta DEVE DEVE DEVE ser um JSON válido sem nenhum wrapper markdown ao redor, seguindo o formato:
{
  "body": "A mensagem curta e natural",
  "detectedName": "o nome do lead detectado (se houver)",
  "detectedNiche": "o setor do lead detectado (se houver)",
  "interestLevel": "ALTO | MÉDIO | BAIXO",
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
