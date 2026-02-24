export interface EvolutionInstance {
    instanceName: string;
    token: string;
    status: string;
}

export const EvolutionService = {
    /**
     * Creates or fetches an instance and returns connection data (like QR Code)
     */
    connect: async (orgId: string, apiUrl: string, apiKey: string, instanceName: string) => {
        try {
            // 1. Check if instance exists
            const instances = await EvolutionService.getInstances(apiUrl, apiKey);
            const existing = instances.find((i: any) => i.instanceName === instanceName);

            if (!existing) {
                try {
                    // 2. Create if not exists
                    console.log(`🔨 Criando nova instância: ${instanceName}`);
                    const createResult = await EvolutionService.createInstance(apiUrl, apiKey, instanceName);
                    return createResult;
                } catch (e: any) {
                    // Se a API disser que já existe, nós ignoramos o erro e tentamos conectar
                    if (e.message.includes("already in use") || e.message.includes("403")) {
                        console.log("ℹ️ Instância já existe no servidor, prosseguindo para conectar.");
                    } else {
                        throw e;
                    }
                }
            }

            // 3. Get QR Code / Connection state para instância existente
            console.log(`🔗 Buscando QR Code para instância existente: ${instanceName}`);

            const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                headers: { "apikey": apiKey }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Erro HTTP ${response.status} ao conectar:`, errorText);
                throw new Error(`Erro na API (${response.status})`);
            }

            return await response.json();
        } catch (error: any) {
            console.error("❌ Falha crítica na conexão com Evolution API:", error.message);
            throw error;
        }
    },

    getInstances: async (apiUrl: string, apiKey: string) => {
        const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
            headers: { "apikey": apiKey }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao buscar instâncias (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        // Na v2 pode vir dentro de um campo 'instances' ou ser um array direto
        return Array.isArray(data) ? data : (data.instances || []);
    },

    createInstance: async (apiUrl: string, apiKey: string, instanceName: string) => {
        const response = await fetch(`${apiUrl}/instance/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify({
                instanceName,
                token: Math.random().toString(36).substring(7),
                integration: "WHATSAPP-BAILEYS",
                qrcode: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao criar instância (${response.status}): ${errorText}`);
        }

        return await response.json();
    },

    logout: async (apiUrl: string, apiKey: string, instanceName: string) => {
        const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
            method: "DELETE",
            headers: { "apikey": apiKey }
        });
        return await response.json();
    },

    sendText: async (apiUrl: string, apiKey: string, instanceName: string, number: string, text: string) => {
        const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify({
                number,
                text,
                delay: 1200,
                linkPreview: false
            })
        });
        return await response.json();
    },

    setWebhook: async (apiUrl: string, apiKey: string, instanceName: string, webhookUrl: string) => {
        const response = await fetch(`${apiUrl}/webhook/instance/${instanceName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify({
                url: webhookUrl,
                enabled: true,
                events: ["MESSAGES_UPSERT"]
            })
        });
        return await response.json();
    }
};
