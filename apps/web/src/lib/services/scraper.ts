import { AIService } from "./ai";

export interface ScrapedLead {
    name: string;
    phone?: string;
    email?: string;
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
            Para cada empresa, tente encontrar: Nome, Telefone (formato completo com DDI, ex: +1973...), E-mail, Website, Categoria e Endereço.
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

            // 3. Enrichment: if phone or email is missing but website exists, scrape the website
            const enrichedLeads = await Promise.all(leads.map(async (lead) => {
                if ((!lead.phone || !lead.email) && lead.website && lead.website.startsWith("http")) {
                    console.log(`🌐 [Scraper] Buscando dados de contato no site: ${lead.website}`);
                    const contactInfo = await ScraperService.findContactsOnSite(lead.website);
                    return { 
                        ...lead, 
                        phone: lead.phone || contactInfo.phone,
                        email: lead.email || contactInfo.email
                    };
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
     * Tries to find contact info (WhatsApp/Email) on a given website.
     */
    findContactsOnSite: async (url: string): Promise<{ phone?: string; email?: string }> => {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const html = await response.text();

            const systemPrompt = `Analise o conteúdo do site e encontre um número de WhatsApp/Telefone e um E-mail de contato.
            Retorne um JSON com os campos "phone" (formato internacional +DDI) e "email". Se algum não for encontrado, deixe nulo.`;

            const aiResponse = await AIService.generateResponse(
                "google",
                "gemini-1.5-flash",
                systemPrompt,
                [{ role: "user", content: `Encontre contatos neste site:\n\n${html.substring(0, 30000)}` }]
            );

            const cleaned = aiResponse.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleaned);

            // Normalização básica de telefone aqui também
            let phone = data.phone ? data.phone.toString().replace(/\D/g, "") : undefined;
            if (phone && !phone.startsWith("+")) phone = "+" + phone;

            return { 
                phone: phone, 
                email: data.email || undefined 
            };

        } catch (error) {
            console.warn(`⚠️ [Scraper] Falha ao acessar site ${url}:`, error);
            return {};
        }
    }
};

