import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";

export type AIProvider = "google" | "openai" | "anthropic";

export interface ChatMessage {
    role: "user" | "model" | "system";
    content: string;
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
        const primaryModel = model || "gemini-1.5-flash";
        const fallbackModel = "gemini-1.5-pro";

        const tryModel = async (modelName: string) => {
            console.log(`🚀 [AIService] Tentando modelo: ${modelName}`);
            const geminiModel = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
                generationConfig: {
                    temperature: temperature
                }
            });

            const history = messages
                .filter(m => m.role !== "system")
                .map(m => ({
                    role: m.role === "model" ? "model" : "user" as any,
                    parts: [{ text: m.content }]
                }));

            const chat = geminiModel.startChat({
                history: history.slice(0, -1),
            });

            const lastMessage = history[history.length - 1];
            const result = await chat.sendMessage(lastMessage.parts[0].text);
            return result.response.text();
        };

        try {
            return await tryModel(primaryModel);
        } catch (err: any) {
            console.warn(`⚠️ [AIService] Falha com ${primaryModel}: ${err.message}.`);
            
            // Se o erro for 404 ou o modelo for o flash, tentamos o pro
            if (primaryModel !== fallbackModel) {
                console.log(`🛡️ [AIService] Tentando fallback para: ${fallbackModel}...`);
                try {
                    return await tryModel(fallbackModel);
                } catch (fallbackErr: any) {
                    console.error(`❌ [AIService] Todas as tentativas de IA falharam.`);
                    throw fallbackErr;
                }
            }
            throw err;
        }
    }
};
