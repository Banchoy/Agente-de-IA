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

        // 1. Tenta Gemini primeiro
        if (env.GOOGLE_GEMINI_API_KEY) {
            try {
                console.log(`📡 [AIService Structured] Tentando Gemini...`);
                const response = await AIService.generateGeminiResponse(model || "gemini-1.5-flash", structuredPrompt, messages, temperature, true);
                const cleaned = response.replace(/```json|```/g, "").trim();
                return JSON.parse(cleaned);
            } catch (err: any) {
                console.warn(`⚠️ [AIService Structured] Gemini falhou: ${err.message}`);
            }
        }
        
        // 2. Tenta todos os modelos gratuitos do OpenRouter
        if (env.OPENROUTER_API_KEY) {
            const freeModels = await AIService.getOpenRouterFreeModels();
            for (const freeModel of freeModels) {
                try {
                    console.log(`📡 [OpenRouter Structured] Tentando: ${freeModel}`);
                    const response = await AIService.generateOpenAICompatibleResponse("openrouter", freeModel, structuredPrompt, messages, temperature, true);
                    const cleaned = response.replace(/```json|```/g, "").trim();
                    return JSON.parse(cleaned);
                } catch (err: any) {
                    console.warn(`⚠️ [OpenRouter Structured] Falhou ${freeModel}: ${err.message}`);
                    continue;
                }
            }
        }

        // 3. Groq como último recurso
        if (env.GROQ_API_KEY) {
            try {
                const response = await AIService.generateOpenAICompatibleResponse("groq", "llama-3.3-70b-versatile", structuredPrompt, messages, temperature, true);
                const cleaned = response.replace(/```json|```/g, "").trim();
                return JSON.parse(cleaned);
            } catch (err: any) {
                console.warn(`⚠️ [AIService Structured] Groq falhou: ${err.message}`);
            }
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
        const leadMeta = (lead.metaData as any) || {};
        const systemPrompt = `
Você é uma assistente comercial humana altamente assertiva chamada Tayná.
Sua missão é converter leads através de uma conversa natural e amigável no WhatsApp.

### SCRIPT DE VENDAS (MUITO IMPORTANTE):
Você deve seguir rigorosamente este fluxo de mensagens:

1. **CONTATO INICIAL (Abertura):**
   - Se esta for a PRIMEIRA mensagem para o lead e ele ainda não respondeu, mande APENAS: "Oi, tudo bem?" ou "Tudo joia?".
   - NÃO se apresente ainda. NÃO fale de consórcio ainda. Espere a pessoa responder.

2. **APÓS A RESPOSTA (Apresentação + Gancho):**
   - Assim que a pessoa responder (ex: "Tudo bem", "Quem é?", "Oi"), você deve dizer:
     "Ah, então, prazer, meu nome é Tayná, né. Eu estou entrando em contato com você porque eu vi que você trabalha com consórcio e eu preciso de uma ajuda sua, só que eu não sei se é com você mesmo ou com outra pessoa que eu consigo uma orientação aí e tal."

3. **CONTINUIDADE (Venda e Planos):**
   - Após o gancho inicial, se a pessoa der abertura, explique como podemos ajudá-la a aumentar o faturamento.
   - Fatos reais: "Tivemos um cliente que faturou mais de R$ 1,5 Milhão em menos de 3 meses com nossa estratégia."

### TABELA DE PREÇOS E PLANOS:
1. **PLANO PREMIUM (R$ 1.750,00)**: CRM Exclusivo + Campanhas Completas + Estrategista Dedicado.
2. **PLANO INTERMEDIÁRIO (R$ 1.250,00)**: Suporte WhatsApp + Gestão de Campanhas. (Sem CRM).
3. **PLANO BÁSICO (R$ 800,00)**: Cobramos comissão (0,25% a 0,30%) sobre vendas. (Sem CRM).

### DIRETRIZES DE PERSONALIDADE:
- Seja natural, direta, ambiciosa e muito prestativa. Use gírias leves como "bora pra cima?".
- Use o histórico para saber em qual fase do script você está.

### FORMATO DE SAÍDA (JSON):
Sua resposta deve ser um JSON válido:
{
  "body": "A mensagem curta e natural",
  "detectedName": "o nome identificado",
  "detectedNiche": "o setor identificado",
  "interestLevel": "ALTO | MÉDIO | BAIXO",
  "isDecisor": true | false | "unknown"
}
`;

        const response = await AIService.generateResilientResponse(systemPrompt, messages, temperature);
        try {
            // Extrator robusto de JSON: busca conteúdo entre chaves { }
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : response;
            const cleaned = jsonStr.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            
            // Se o parsing funcionar mas o body vier vazio, algo está errado
            if (!parsed.body && typeof parsed === 'object') {
                console.warn("⚠️ [AIService] JSON parsed mas sem campo 'body'. Usando resposta bruta.");
                return { body: response };
            }

            return parsed;
        } catch (e) {
            console.warn("⚠️ [AIService] Falha ao parsear JSON adaptativo, limpando e tentando extrair apenas texto.");
            // Fallback: Tenta remover campos técnicos se o JSON estiver sujo mas visível
            const fallbackBody = response
                .replace(/"body":/g, "")
                .replace(/"detectedName":/g, "")
                .replace(/"detectedNiche":/g, "")
                .replace(/"interestLevel":/g, "")
                .replace(/"isDecisor":/g, "")
                .replace(/[{}"[\],]/g, "")
                .trim();
            
            return { body: fallbackBody || response };
        }
    },

    generateGeminiResponse: async (
        model: string,
        systemPrompt: string,
        messages: ChatMessage[],
        temperature: number = 0.7,
        jsonMode: boolean = false
    ) => {
        const apiKey = env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GEMINI_API_KEY not configured.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 1. Descoberta dinâmica de modelos via API REST
        let modelToUse = model || "gemini-1.5-flash";
        let availableModels: string[] = [];
        
        try {
            console.log(`🔍 [AIService] Descobrindo modelos compatíveis via API...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            
            if (data.models && Array.isArray(data.models)) {
                availableModels = data.models
                    .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
                    .map((m: any) => m.name.replace("models/", ""));
                
                console.log(`🤖 [AIService] Modelos compatíveis com sua chave: ${availableModels.join(", ")}`);

                // Se o modelo solicitado não estiver na lista ou for o padrão, buscamos a melhor opção
                if (!availableModels.includes(modelToUse)) {
                    console.warn(`⚠️ [AIService] Modelo ${modelToUse} não disponível para esta chave.`);
                    const bestAvailable = availableModels.find((m: string) => m === "gemini-2.0-flash") ||
                                         availableModels.find((m: string) => m === "gemini-1.5-flash") ||
                                         availableModels.find((m: string) => m.includes("flash-latest")) ||
                                         availableModels.find((m: string) => m.includes("2.0-flash")) ||
                                         availableModels[0];
                    
                    if (bestAvailable) {
                        console.log(`✅ [AIService] Auto-selecionado: ${bestAvailable}`);
                        modelToUse = bestAvailable;
                    }
                }
            }
        } catch (fetchErr) {
            console.warn(`⚠️ [AIService] Falha ao listar modelos via API. Usando tentativa direta: ${modelToUse}`);
        }

        const tryModel = async (modelName: string) => {
            console.log(`🚀 [AIService] Tentando geração com: ${modelName}`);
            const geminiModel = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
                generationConfig: {
                    temperature: temperature,
                    responseMimeType: jsonMode ? "application/json" : "text/plain"
                }
            });

            const history = messages
                .filter(m => m.role !== "system")
                .map(m => {
                    const parts: any[] = [];
                    if (m.content) parts.push({ text: m.content });
                    if (m.media) parts.push({ inlineData: m.media });
                    
                    return {
                        role: m.role === "model" ? "model" : "user" as any,
                        parts: parts
                    };
                });

            const chat = geminiModel.startChat({
                history: history.slice(0, -1),
            });

            const lastMessage = history[history.length - 1];
            const result = await chat.sendMessage(lastMessage.parts);
            return result.response.text();
        };

        // LOOP DE RESILIÊNCIA: Tenta o modelo preferido e depois todos os outros disponíveis
        const modelsToTry = [modelToUse, ...availableModels.filter(m => m !== modelToUse)];
        
        for (const currentModel of modelsToTry) {
            try {
                return await tryModel(currentModel);
            } catch (err: any) {
                const errMsg = err.message || "";
                console.error(`❌ [AIService] Erro com ${currentModel}:`, errMsg);

                if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("limit")) {
                    console.warn(`⚠️ [AIService] Limite atingido para ${currentModel}. Pulando para o próximo...`);
                    continue;
                }

                if (errMsg.includes("404") || errMsg.includes("not found")) {
                    console.warn(`⚠️ [AIService] Modelo ${currentModel} não suportado. Pulando...`);
                    continue;
                }

                // Se houver algum erro de segurança ou formato (ex: Gemini não suporta algo no histórico), 
                // tentamos o próximo modelo também como garantia.
                console.warn(`⚠️ [AIService] Erro genérico com ${currentModel}. Tentando próximo por segurança...`);
                continue;
            }
        }

        throw new Error("Não foi possível gerar resposta com nenhum dos modelos disponíveis para esta chave.");
    },

    generateOpenAICompatibleResponse: async (
        provider: "openai" | "groq" | "openrouter",
        model: string,
        systemPrompt: string,
        messages: ChatMessage[],
        temperature: number = 0.7,
        jsonMode: boolean = false
    ) => {
        let apiKey = "";
        let baseUrl = "";
        let modelName = model;

        if (provider === "openai") {
            apiKey = env.OPENAI_API_KEY || "";
            baseUrl = "https://api.openai.com/v1";
            modelName = model || "gpt-4o-mini";
        } else if (provider === "groq") {
            apiKey = env.GROQ_API_KEY || "";
            baseUrl = "https://api.groq.com/openai/v1";
            modelName = model || "llama-3.3-70b-versatile";
        } else if (provider === "openrouter") {
            apiKey = env.OPENROUTER_API_KEY || "";
            baseUrl = "https://openrouter.ai/api/v1";
            modelName = model || "google/gemini-2.0-flash-001";
        }

        if (!apiKey) throw new Error(`API Key for ${provider} not configured.`);

        const formattedMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({
                role: m.role === "model" ? "assistant" : m.role,
                content: m.content
            }))
        ];

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                ...(provider === "openrouter" ? { "HTTP-Referer": env.NEXT_PUBLIC_APP_URL || "https://localhost:3000" } : {})
            },
            body: JSON.stringify({
                model: modelName,
                messages: formattedMessages,
                temperature: temperature,
                response_format: jsonMode ? { type: "json_object" } : undefined
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`[${provider}] API Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    /**
     * Busca dinamicamente os modelos gratuitos do OpenRouter.
     */
    getOpenRouterFreeModels: async (): Promise<string[]> => {
        const apiKey = env.OPENROUTER_API_KEY;
        if (!apiKey) return [];

        // Cache simples em memória (evita re-buscar a cada mensagem)
        if ((AIService as any)._freeModelsCache) {
            return (AIService as any)._freeModelsCache;
        }

        try {
            const res = await fetch("https://openrouter.ai/api/v1/models", {
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            const data = await res.json();

            // Um modelo é "free" se o pricing de prompt e completion for "0" ou se o ID terminar em ":free"
            const freeModels: string[] = data.data
                .filter((m: any) => {
                    const isFreeId = m.id.endsWith(":free");
                    const isFreePricing = parseFloat(m.pricing?.prompt || "1") === 0;
                    return isFreeId || isFreePricing;
                })
                .map((m: any) => m.id);

            console.log(`🆓 [OpenRouter] ${freeModels.length} modelos gratuitos encontrados.`);
            (AIService as any)._freeModelsCache = freeModels;
            return freeModels;
        } catch (err: any) {
            console.warn("⚠️ [OpenRouter] Falha ao buscar modelos gratuitos:", err.message);
            // Fallback curado: modelos que são conhecidamente gratuitos
            return [
                "google/gemini-2.0-flash-exp:free",
                "google/gemma-3-27b-it:free",
                "meta-llama/llama-4-maverick:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "mistralai/mistral-7b-instruct:free",
                "deepseek/deepseek-chat:free",
                "qwen/qwen2.5-vl-72b-instruct:free",
            ];
        }
    },

    /**
     * Tenta gerar uma resposta usando diferentes provedores em sequência caso ocorra erro.
     */
    generateResilientResponse: async (
        systemPrompt: string,
        messages: ChatMessage[],
        temperature: number = 0.7
    ) => {
        // 1. Tenta Gemini primeiro (provider principal)
        if (env.GOOGLE_GEMINI_API_KEY) {
            try {
                console.log(`📡 [AIService] Tentando Gemini (principal)...`);
                return await AIService.generateGeminiResponse("gemini-1.5-flash", systemPrompt, messages, temperature);
            } catch (err: any) {
                console.warn(`⚠️ [AIService] Gemini falhou: ${err.message}. Tentando OpenRouter...`);
            }
        }

        // 2. Tenta todos os modelos gratuitos do OpenRouter
        if (env.OPENROUTER_API_KEY) {
            const freeModels = await AIService.getOpenRouterFreeModels();
            for (const model of freeModels) {
                try {
                    console.log(`📡 [OpenRouter Free] Tentando modelo: ${model}`);
                    const result = await AIService.generateOpenAICompatibleResponse("openrouter", model, systemPrompt, messages, temperature);
                    console.log(`✅ [OpenRouter Free] Sucesso com: ${model}`);
                    return result;
                } catch (err: any) {
                    console.warn(`⚠️ [OpenRouter Free] Falhou ${model}: ${err.message}`);
                    continue;
                }
            }
        }

        // 3. Tenta Groq como último recurso
        if (env.GROQ_API_KEY) {
            try {
                console.log(`📡 [AIService] Tentando Groq como último recurso...`);
                return await AIService.generateOpenAICompatibleResponse("groq", "llama-3.3-70b-versatile", systemPrompt, messages, temperature);
            } catch (err: any) {
                console.warn(`⚠️ [AIService] Groq falhou: ${err.message}`);
            }
        }

        throw new Error("Todos os provedores de IA falharam.");
    }
}
