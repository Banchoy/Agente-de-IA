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

            // 1. Tentar obter QR Code diretamente (Se já existe)
            // Tentaremos 3 endpoints comuns da v2
            const endpoints = [
                `${apiUrl}/instance/connect/${instanceName}`,
                `${apiUrl}/instance/qr-code/base64/${instanceName}`,
                `${apiUrl}/instances/${instanceName}/qr-code/image`
            ];

            for (const url of endpoints) {
                try {
                    console.log(`🔍 Tentando endpoint: ${url}`);
                    const response = await fetch(url, { headers: { "apikey": apiKey } });

                    if (response.ok) {
                        const data = await response.json();
                        // Verifica se tem algo que pareça um QR code
                        const qr = data.base64 || data.qrcode?.base64 || data.code || (typeof data === 'string' && data.length > 100 ? data : null);

                        if (qr) {
                            console.log(`✅ QR Code encontrado no endpoint: ${url}`);
                            return data;
                        }
                    } else if (response.status === 404) {
                        console.log(`ℹ️ Endpoint retornou 404: ${url}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ Falha ao tentar endpoint ${url}:`, e);
                }
            }

            // 2. Se nenhum retornou QR, vamos tentar criar a instância
            console.log(`🔨 Nenhum QR encontrado. Tentando criar a instância: ${instanceName}`);
            try {
                const createResult = await EvolutionService.createInstance(apiUrl, apiKey, instanceName);

                // Verifica se o QR já veio na criação
                const qr = createResult.base64 || createResult.qrcode?.base64 || createResult.code;
                if (qr) return createResult;

                console.log("⏳ Instância criada, mas sem QR Code ainda. Iniciando espera...");

                // Loop de Retry: Espera até 10 segundos pelo QR Code
                for (let i = 0; i < 5; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    console.log(`🔍 Polling por QR Code (${i + 1}/5)...`);

                    const pollResp = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                        headers: { "apikey": apiKey }
                    });

                    if (pollResp.ok) {
                        const pollData = await pollResp.json();
                        const pollQr = pollData.base64 || pollData.qrcode?.base64 || pollData.code;
                        if (pollQr) {
                            console.log("✅ QR Code obtido após espera!");
                            return pollData;
                        }
                    }
                }
            } catch (createErr: any) {
                if (createErr.message.includes("already in use") || createErr.message.includes("403")) {
                    console.log("ℹ️ Instância já existe no servidor.");
                } else {
                    throw createErr;
                }
            }

            // 3. Se chegamos aqui e ainda não temos QR, deletamos para tentar do zero no próximo clique
            console.log(`🧹 Instância ${instanceName} não gerou QR a tempo. Deletando para reset...`);
            try {
                const deleteUrl = `${apiUrl}/instance/delete/${instanceName}`;
                await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: { "apikey": apiKey }
                });
            } catch (e) {
                console.warn("⚠️ Falha ao deletar:", e);
            }

            throw new Error("O WhatsApp está demorando para gerar o QR Code. Por favor, tente novamente em instantes.");

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
