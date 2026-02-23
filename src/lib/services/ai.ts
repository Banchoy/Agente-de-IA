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
        messages: ChatMessage[]
    ) => {
        if (provider === "google") {
            return await AIService.generateGeminiResponse(model, systemPrompt, messages);
        }

        // Placeholder for other providers
        throw new Error(`Provider ${provider} not implemented yet.`);
    },

    generateGeminiResponse: async (
        model: string,
        systemPrompt: string,
        messages: ChatMessage[]
    ) => {
        const apiKey = env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GEMINI_API_KEY not configured.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({
            model: model || "gemini-1.5-flash",
            systemInstruction: systemPrompt
        });

        // Convert messages to Gemini format
        // Gemini expects roles 'user' and 'model'. 
        // Our 'system' prompt is passed in systemInstruction above.
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
    }
};
