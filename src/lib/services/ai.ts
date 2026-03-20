import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";

export type AIProvider = "google" | "openai" | "anthropic";

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

        // Placeholder for other providers
        throw new Error(`Provider ${provider} not implemented yet.`);
    },

    generateGeminiResponse: async (
        model: string,
        systemPrompt: string,
        messages: ChatMessage[],
        temperature: number = 0.7
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
                    temperature: temperature
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
    }
}
