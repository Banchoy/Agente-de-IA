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

            // 3. Loop de Polling (Focado no endpoint /connect da v2)
            console.log(`⏳ Aguardando geração do QR Code via /instance/connect para ${instanceName}...`);
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 4000)); // Aumentado para 4s para estabilidade
                console.log(`🔍 Tentativa de busca ${i + 1}/20 para: ${instanceName}...`);

                // Na v2, o endpoint principal para QR e conexão é o /instance/connect
                const connectUrl = `${apiUrl}/instance/connect/${instanceName}`;
                
                try {
                    const pollResp = await fetch(connectUrl, { headers: { "apikey": apiKey } });
                    if (pollResp.ok) {
                        const pollData = await pollResp.json();

                        // Caso a instância já conecte sozinha (por persistência de sessão)
                        if (pollData?.instance?.status === "open" || pollData?.status === "open") {
                            console.log("✅ Instância já está conectada via /connect!");
                            return pollData;
                        }

                        // Busca o QR code no retorno padrão da v2
                        const pollQr = pollData?.base64 || 
                                       pollData?.qrcode?.base64 || 
                                       pollData?.code || 
                                       pollData?.qrcode;

                        if (pollQr && typeof pollQr === 'string' && pollQr.length > 50) {
                            console.log(`✅ QR Code CAPTURADO via /instance/connect`);
                            return { ...pollData, base64: pollQr };
                        }
                    } else if (pollResp.status === 404) {
                        console.warn(`⚠️ Instância ${instanceName} não encontrada no polling. Aguardando...`);
                    }
                } catch (e) { /* silent fail */ }
            }

            // 4. Se chegamos aqui, mantemos a instância viva
            console.log(`⚠️ Tempo esgotado para ${instanceName}.`);
            throw new Error("O servidor WhatsApp demorou para responder. Por favor, tente clicar em 'Conectar' novamente em alguns segundos.");

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
                token: apiKey, // Usamos a key global como token para simplificar a autenticação das chamadas
                integration: "WHATSAPP-BAILEYS",
                qrcode: true,
                // Opções de estabilidade recomendadas pelo repositório oficial:
                alwaysOnline: true,
                readMessages: true,
                readStatus: true,
                syncFullHistory: false, // Evita sobrecarga inicial
                rejectCall: false,
                groupsIgnore: false
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
