import { AIService } from "./ai";

export interface ScrapedLead {
    name: string;
    phone?: string;
    website?: string;
    category?: string;
    address?: string;
}

export const ScraperService = {
    /**
     * Scrapes business data from a Google Maps URL or similar.
     */
    scrapeMaps: async (url: string): Promise<ScrapedLead[]> => {
        console.log(`🔍 [Scraper] Iniciando scrape de: ${url}`);
        
        try {
            // 1. Fetch the content
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const html = await response.text();

            // 2. Use Gemini to extract business list
            const systemPrompt = `Você é um extrator de dados especialista. Analise o HTML/Texto de uma página do Google Maps e extraia uma lista de empresas.
            Para cada empresa, tente encontrar: Nome, Telefone (formato completo com DDI, ex: +1973...), Website, Categoria e Endereço.
            Retorne APENAS um JSON array de objetos. Se não encontrar nada, retorne [].`;

            const aiResponse = await AIService.generateResponse(
                "google",
                "gemini-1.5-flash",
                systemPrompt,
                [{ role: "user", content: `Analise este conteúdo e extraia as empresas:\n\n${html.substring(0, 50000)}` }]
            );

            const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();
            const leads: ScrapedLead[] = JSON.parse(cleanedResponse);

            console.log(`✅ [Scraper] ${leads.length} potenciais leads encontrados.`);

            // 3. Enrichment: if phone is missing but website exists, scrape the website
            const enrichedLeads = await Promise.all(leads.map(async (lead) => {
                if (!lead.phone && lead.website && lead.website.startsWith("http")) {
                    console.log(`🌐 [Scraper] Buscando WhatsApp no site: ${lead.website}`);
                    const phone = await ScraperService.findWhatsAppOnSite(lead.website);
                    if (phone) return { ...lead, phone };
                }
                return lead;
            }));

            return enrichedLeads.filter(l => l.name);

        } catch (error) {
            console.error("❌ [Scraper] Erro ao raspar URL:", error);
            throw error;
        }
    },

    /**
     * Tries to find a WhatsApp number on a given website.
     */
    findWhatsAppOnSite: async (url: string): Promise<string | undefined> => {
        try {
            const response = await fetch(url, { timeout: 10000 } as any);
            const html = await response.text();

            const systemPrompt = `Analise o conteúdo do site e encontre um número de WhatsApp ou telefone de contato.
            Retorne APENAS o número no formato internacional completo (ex: +1973...) ou NADA se não encontrar.`;

            const aiResponse = await AIService.generateResponse(
                "google",
                "gemini-1.5-flash",
                systemPrompt,
                [{ role: "user", content: `Encontre o WhatsApp neste site:\n\n${html.substring(0, 30000)}` }]
            );

            const phone = aiResponse.trim().replace(/\D/g, "");
            return phone.length >= 10 ? `+${phone}` : undefined;

        } catch (error) {
            console.warn(`⚠️ [Scraper] Falha ao acessar site ${url}:`, error);
            return undefined;
        }
    }
};
