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
            console.log(`🚀 Iniciando conexão para: ${instanceName}`);

            // 1. Tentar obter QR Code/Status diretamente
            const endpoints = [
                `${apiUrl}/instance/connect/${instanceName}`,
                `${apiUrl}/instance/qr-code/base64/${instanceName}`
            ];

            for (const url of endpoints) {
                try {
                    const response = await fetch(url, { headers: { "apikey": apiKey } });
                    if (response.ok) {
                        const data = await response.json();
                        const qr = data.base64 || data.qrcode?.base64 || data.code;
                        
                        if (qr) {
                            console.log(`✅ QR Code encontrado em: ${url}`);
                            return data;
                        }

                        if (data.instance?.status === "open" || data.status === "open") {
                            console.log("✅ Instância já conectada.");
                            return data;
                        }
                    }
                } catch (e) {}
            }

            // 2. Tentar Criar/Reconectar
            try {
                const createResult = await EvolutionService.createInstance(apiUrl, apiKey, instanceName);
                const qr = createResult.base64 || createResult.qrcode?.base64 || createResult.code;
                if (qr) return createResult;
            } catch (createErr: any) {
                console.log("ℹ️ Instância já existe ou erro na criação. Seguindo para polling...");
            }

            // 3. Loop de Polling (Resiliente a 'connecting')
            console.log(`⏳ Aguardando QR Code/Conexão para ${instanceName}...`);
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 5000));
                
                try {
                    const pollResp = await fetch(`${apiUrl}/instance/connect/${instanceName}`, { 
                        headers: { "apikey": apiKey } 
                    });

                    if (pollResp.ok) {
                        const pollData = await pollResp.json();
                        const status = pollData?.instance?.status || pollData?.status;
                        const pollQr = pollData?.base64 || pollData?.qrcode?.base64 || pollData?.code || pollData?.qrcode;

                        if (status === "open") {
                            console.log("✅ Conexão estabelecida!");
                            return pollData;
                        }

                        if (pollQr && typeof pollQr === 'string' && pollQr.length > 50) {
                            console.log(`✅ QR Code capturado!`);
                            return { ...pollData, base64: pollQr };
                        }

                        console.log(`🔍 Status: ${status || 'desconhecido'} - Tentativa ${i + 1}/15`);
                    }
                } catch (e) {}
            }

            // Fallback: Retorna status se não houver QR mas a instância existir
            return { success: true, status: "connecting", message: "A instância está sendo preparada. Aguarde alguns segundos." };

        } catch (error: any) {
            console.error("❌ Falha na conexão:", error.message);
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
        // Obtermos a URL do webhook (pode ser via env ou inferida)
        // Se estivermos no Railway, a URL pública é necessária para a Evolution nos alcançar,
        // mas a URL interna é mais estável se o Evolution estiver no mesmo cluster.
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/evolution`;

        const response = await fetch(`${apiUrl}/instance/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify({
                instanceName,
                token: apiKey,
                integration: "WHATSAPP-BAILEYS",
                qrcode: true,
                alwaysOnline: false, // 🚀 DESATIVADO na criação inicial para evitar loops de handshake
                readMessages: true,
                readStatus: true,
                syncFullHistory: false,
                rejectCall: false,
                groupsIgnore: false,
                // Webhook configurado na criação para evitar perda de eventos iniciais
                webhook: {
                    url: webhookUrl,
                    enabled: true,
                    byEvents: false,
                    base64: true,
                    events: [
                        "QRCODE_UPDATED",
                        "MESSAGES_UPSERT",
                        "MESSAGES_UPDATE",
                        "CONNECTION_UPDATE",
                        "TYPEBOT_START",
                        "TYPEBOT_UNKNOWN_MESSAGE"
                    ]
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Falha ao criar instância (${response.status}):`, errorText);
            throw new Error(`Erro ao criar instância (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log("✨ Instância criada com sucesso! Dados:", JSON.stringify(data, null, 2));
        return data;
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
                delay: 600,
                linkPreview: false
            })
        });
        return await response.json();
    },

    sendAudio: async (apiUrl: string, apiKey: string, instanceName: string, number: string, audioUrl: string) => {
        const response = await fetch(`${apiUrl}/message/sendWhatsAppAudio/${instanceName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": apiKey
            },
            body: JSON.stringify({
                number,
                audio: audioUrl,
                delay: 600,
                ptt: true
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
    },

    deleteInstance: async (apiUrl: string, apiKey: string, instanceName: string) => {
        console.log(`🗑️ Deletando instância: ${instanceName}`);
        try {
            const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
                method: "DELETE",
                headers: { "apikey": apiKey }
            });
            const data = await response.json();
            return data;
        } catch (e) {
            console.warn(`⚠️ Erro ao tentar deletar instância ${instanceName}:`, e);
            return null;
        }
    }
};
