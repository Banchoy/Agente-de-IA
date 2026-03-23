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

        const fallbacks: {provider: AIProvider, model: string}[] = [
            { provider: "google", model: model || "gemini-1.5-flash" },
            { provider: "groq", model: "llama-3.3-70b-versatile" },
            { provider: "openai", model: "gpt-4o-mini" },
            { provider: "openrouter", model: "google/gemini-2.0-flash-001" }
        ];

        for (const fb of fallbacks) {
            try {
                console.log(`📡 [AIService] Tentando Resposta Estruturada Resiliente: ${fb.provider} (${fb.model})`);
                
                let response = "";
                if (fb.provider === "google") {
                    response = await AIService.generateGeminiResponse(fb.model, structuredPrompt, messages, temperature, true);
                } else {
                    response = await AIService.generateOpenAICompatibleResponse(fb.provider as any, fb.model, structuredPrompt, messages, temperature, true);
                }

                // Clean markdown artifacts if any
                const cleaned = response.replace(/```json|```/g, "").trim();
                return JSON.parse(cleaned);
            } catch (err: any) {
                console.warn(`⚠️ [AIService] Falha na resposta estruturada com ${fb.provider}: ${err.message}`);
                continue;
            }
        }

        throw new Error("Todos os provedores de IA falharam na resposta estruturada.");
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
     * Tenta gerar uma resposta usando diferentes provedores em sequência caso ocorra erro.
     */
    generateResilientResponse: async (
        systemPrompt: string,
        messages: ChatMessage[],
        temperature: number = 0.7
    ) => {
        // Sequência de fallback: Gemini -> Groq (Llama) -> OpenRouter (Gemini) -> OpenAI
        const fallbacks: {provider: AIProvider, model: string}[] = [
            { provider: "google", model: "gemini-1.5-flash" },
            { provider: "groq", model: "llama-3.3-70b-versatile" },
            { provider: "openrouter", model: "google/gemini-2.0-flash-001" },
            { provider: "openai", model: "gpt-4o-mini" }
        ];

        for (const fb of fallbacks) {
            try {
                console.log(`📡 [AIService] Tentando Fallback: ${fb.provider} (${fb.model})`);
                return await AIService.generateResponse(fb.provider, fb.model, systemPrompt, messages, temperature);
            } catch (err: any) {
                console.warn(`⚠️ [AIService] Falha no fallback ${fb.provider}: ${err.message}`);
                continue;
            }
        }

        throw new Error("Todos os provedores de IA falharam.");
    }
}
