import { db } from "../db";
import { leads, pipelines, stages } from "@saas/db";
import { eq } from "drizzle-orm";

export const ApifyService = {
    /**
     * Inicia o ator de Google Maps Extractor do Apify.
     * Como o scraper pode demorar minutos ou horas, isso usa Webhooks para retornar o resultado via rota API.
     */
    startGoogleMapsExtractor: async (url: string, config: any, orgId: string, baseUrl?: string) => {
        const token = process.env.APIFY_API_TOKEN;
        if (!token) throw new Error("Missing APIFY_API_TOKEN");

        const finalBaseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://agente-de-ia-production-1081.up.railway.app";
        // Webhook que o Apify vai chamar quando terminar a extração com sucesso:
        const webhookUrl = `${finalBaseUrl}/api/webhooks/apify?orgId=${orgId}&niche=${encodeURIComponent(config.niche || "")}`;
        
        // Passar os metadados na query do webhook ou na payload, optamos pela payload do webhook e query no actor
        // Actor default de Gmaps muito usado: compass/google-maps-extractor
        let actorId = process.env.APIFY_ACTOR_ID || "compass~google-maps-extractor";
        // Normalizar actorId: o Apify v2 espera ~ no lugar de / para nomes de Store Actors na URL
        actorId = actorId.replace("/", "~");

        const startUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;

        console.log(`🚀 [Apify] Disparando Actor ${actorId} para URL: ${url}`);

        // O payload exato depende do ator contratado pelo cliente. 
        // Estamos usando o formato padrão de Google Maps Extractor.
        const payload = {
            startUrls: [{ url }],
            maxCrawledPlacesPerSearch: config.maxItems ? parseInt(config.maxItems) : 50,
            language: "pt-BR",
            minRating: config.minRating ? parseFloat(config.minRating) : undefined,
            reviewsCount: config.minReviews ? parseInt(config.minReviews) : undefined,
            // Atendimento da solicitação do cliente: tentar puxar os contatos dos websites extraídos.
            // Para the `compass~crawler-google-places` ou `compass~google-maps-extractor`:
            scrapeWebsites: true,
            extractEmailsAndContacts: true,
            extractContacts: true,
            // custom fields to pass state
            customData: {
                orgId,
                config
            }
        };

        const response = await fetch(startUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                // Registrando Webhook para este Run específico
                webhooks: [
                    {
                        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
                        requestUrl: webhookUrl,
                        payloadTemplate: `{
                            "runId": {{run.id}},
                            "datasetId": {{run.defaultDatasetId}},
                            "customData": {{run.customData}}
                        }`
                    }
                ]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro ao iniciar Apify Actor: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        console.log(`✅ [Apify] Run ${data.data.id} iniciado. Webhook aguardando em: ${webhookUrl}`);
        
        return data.data;
    },

    /**
     * Busca o status atual de uma run no Apify.
     */
    getRunStatus: async (runId: string) => {
        const token = process.env.APIFY_API_TOKEN;
        const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.data; // Retorna status, defaultDatasetId, etc.
    },

    /**
     * Busca os itens de um dataset específico.
     */
    getDatasetItems: async (datasetId: string) => {
        const token = process.env.APIFY_API_TOKEN;
        const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
        if (!response.ok) return [];
        return await response.json();
    }
};
