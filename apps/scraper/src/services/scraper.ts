import puppeteer, { Browser, Page } from "puppeteer-core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { leads } from "@saas/db";

export interface ScrapedLead {
    name: string;
    phone?: string;
    website?: string;
    category?: string;
    address?: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const ScraperService = {
    /**
     * Scrapes Google Maps results using Puppeteer.
     */
    scrapeMaps: async (url: string): Promise<ScrapedLead[]> => {
        console.log(`🔍 [Ghost Scraper] Abrindo: ${url}`);
        let browser: Browser | null = null;
        
        try {
            const wsEndpoint = process.env.BROWSERLESS_URL; // For Browserless
            
            if (wsEndpoint) {
                browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
            } else {
                // Local launch (Railway Nixpacks)
                browser = await (puppeteer as any).launch({
                    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
                    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                });
            }

            const page = await browser!.newPage();
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36");
            
            await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

            // Scroll to load results (Google Maps typical behavior)
            console.log("📜 [Ghost Scraper] Rolando para carregar mais resultados...");
            await page.evaluate(async () => {
                const scrollableSection = document.querySelector('div[role="feed"]');
                if (scrollableSection) {
                    for (let i = 0; i < 5; i++) {
                        scrollableSection.scrollBy(0, 1000);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            });

            const html = await page.content();
            
            // AI Extraction
            const systemPrompt = `Você é um extrator de dados especialista. Analise o HTML de uma página do Google Maps e extraia os leads.
            Retorne APENAS um JSON array de objetos: [{"name": string, "phone": string, "website": string, "category": string, "address": string}]`;

            const result = await model.generateContent([
                systemPrompt,
                { text: `Extraia os leads deste HTML:\n\n${html.substring(0, 50000)}` }
            ]);

            const aiResponse = result.response.text();
            const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();
            const leads: ScrapedLead[] = JSON.parse(cleanedResponse);

            console.log(`✅ [Ghost Scraper] ${leads.length} leads encontrados.`);

            // Close browser early for efficiency
            await browser!.close();
            browser = null;

            // Enrichment (Fetch websites for WhatsApp if missing)
            const enrichedLeads = await Promise.all(leads.map(async (lead) => {
                if (!lead.phone && lead.website && lead.website.startsWith("http")) {
                    console.log(`🌐 [Enrichment] Buscando WhatsApp no site: ${lead.website}`);
                    lead.phone = await ScraperService.findWhatsAppOnSite(lead.website);
                }
                return lead;
            }));

            return enrichedLeads.filter(l => l.name);

        } catch (error) {
            console.error("❌ [Ghost Scraper] Erro fatal:", error);
            if (browser) await browser.close();
            throw error;
        }
    },

    /**
     * Finds WhatsApp on a website.
     */
    findWhatsAppOnSite: async (url: string): Promise<string | undefined> => {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
            const html = await response.text();

            // Regex Fallback (Fast)
            const whatsappRegex = /(https?:\/\/)?(api\.whatsapp\.com\/send\?phone=|wa\.me\/)([0-9]{10,13})/g;
            const matches = html.match(whatsappRegex);
            
            if (matches && matches.length > 0) {
                const phone = matches[0].replace(/\D/g, "");
                if (phone.length >= 10) return `+${phone.startsWith("55") ? "" : "55"}${phone}`;
            }

            // AI Extraction (Smart)
            const prompt = `Encontre um WhatsApp (+55...) neste texto de site. Retorne APENAS o número formatado ou NADA. Texto:\n\n${html.substring(0, 20000)}`;
            const result = await model.generateContent(prompt);
            const phone = result.response.text().trim().replace(/\D/g, "");

            return phone.length >= 10 ? `+${phone.startsWith("55") ? "" : "55"}${phone}` : undefined;
        } catch {
            return undefined;
        }
    }
};
