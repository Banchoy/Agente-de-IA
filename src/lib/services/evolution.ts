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

            // 2. Criar ou validar existência
            try {
                const createResult = await EvolutionService.createInstance(apiUrl, apiKey, instanceName);
                const qr = createResult.base64 || createResult.qrcode?.base64 || createResult.code;
                if (qr) return createResult;
            } catch (createErr: any) {
                if (createErr.message.includes("already in use") || createErr.message.includes("403")) {
                    console.log("ℹ️ Instância já existe. Prosseguindo para o polling de QR Code...");
                } else {
                    throw createErr;
                }
            }

            // 3. Loop de Polling (Executa para novas e existentes)
            console.log(`⏳ Aguardando geração do QR Code para ${instanceName} (espera máx 60s)...`);
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 3000));
                console.log(`🔍 Tentativa de busca ${i + 1}/20 para: ${instanceName}...`);

                const pollUrls = [
                    `${apiUrl}/instance/connect/${instanceName}`,
                    `${apiUrl}/instance/qr-code/base64/${instanceName}`
                ];

                for (const url of pollUrls) {
                    try {
                        const pollResp = await fetch(url, { headers: { "apikey": apiKey } });
                        if (pollResp.ok) {
                            const contentType = pollResp.headers.get("content-type");
                            let pollData: any;

                            if (contentType?.includes("application/json")) {
                                pollData = await pollResp.json();
                            } else {
                                const text = await pollResp.text();
                                if (text.length > 100) pollData = { base64: text };
                            }

                            // Se a instância já estiver aberta/conectada, retornamos o status
                            if (pollData?.instance?.status === "open" || pollData?.status === "open") {
                                console.log("✅ Instância já está conectada!");
                                return pollData;
                            }

                            const pollQr = pollData?.base64 || pollData?.qrcode?.base64 || pollData?.code || pollData?.qrcode;
                            if (pollQr && typeof pollQr === 'string' && pollQr.length > 50) {
                                console.log(`✅ QR Code CAPTURADO com sucesso em: ${url}`);
                                return pollData;
                            }
                        }
                    } catch (e) { /* silent fail */ }
                }
            }

            // 4. Se chegamos aqui, mantemos a instância viva
            console.log(`⚠️ Tempo esgotado para ${instanceName}.`);
            throw new Error("O servidor WhatsApp está processando. Aguarde 15 segundos e clique em Conectar novamente.");

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
