import { env } from "../env";

export interface EvolutionInstance {
    instanceName: string;
    token: string;
    status: string;
}

export const EvolutionService = {
    getInstances: async () => {
        const apiUrl = env.EVOLUTION_API_URL;
        const apiKey = env.EVOLUTION_API_KEY;

        if (!apiUrl || !apiKey) {
            throw new Error("Evolution API credentials not configured.");
        }

        const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
            headers: {
                "apikey": apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch instances: ${response.statusText}`);
        }

        return await response.json();
    },

    createInstance: async (instanceName: string) => {
        const apiUrl = env.EVOLUTION_API_URL;
        const apiKey = env.EVOLUTION_API_KEY;

        if (!apiUrl || !apiKey) return null;

        const response = await fetch(`${apiUrl}/instance/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify({
                instanceName,
                token: Math.random().toString(36).substring(7),
                qrcode: true
            })
        });

        return await response.json();
    }
};
