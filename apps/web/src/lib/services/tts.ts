
import { env } from "../env";

export type TTSProvider = "openai" | "elevenlabs" | "coqui";

export const TTSService = {
    /**
     * Converts text to speech and returns a public URL or base64.
     * For high-quality production, we recommend OpenAI or ElevenLabs.
     * For local/free, we recommend pointing coquiUrl to a local TTS instance.
     */
    generateAudio: async (
        text: string,
        provider: TTSProvider = "openai",
        voiceId?: string,
        coquiUrl?: string
    ): Promise<string> => {
        console.log(`🎙️ Generating audio with ${provider} for text: ${text.substring(0, 30)}...`);

        if (provider === "coqui") {
            if (!coquiUrl) throw new Error("Coqui URL not provided.");
            return await TTSService.generateCoquiAudio(text, coquiUrl);
        }

        if (provider === "openai") {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error("OPENAI_API_KEY not configured.");
            return await TTSService.generateOpenAIAudio(text, apiKey, voiceId || "alloy");
        }

        throw new Error(`TTS Provider ${provider} not implemented.`);
    },

    generateOpenAIAudio: async (text: string, apiKey: string, voice: string) => {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: voice,
                input: text
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI TTS Error: ${err}`);
        }

        // Return base64 for Evolution API (v2 supports base64 directly or URL)
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:audio/mp3;base64,${base64}`;
    },

    generateCoquiAudio: async (text: string, url: string) => {
        // Implementation for local Coqui TTS API
        const response = await fetch(`${url}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error("Coqui TTS offline.");
        
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:audio/wav;base64,${base64}`;
    }
};
