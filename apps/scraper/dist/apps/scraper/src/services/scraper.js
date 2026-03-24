"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
// @ts-nocheck
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const generative_ai_1 = require("@google/generative-ai");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
exports.ScraperService = {
    /**
     * Scrapes Google Maps results using Puppeteer.
     */
    scrapeMaps: async (url, onLeadExtracted) => {
        console.log(`🔍 [Ghost Scraper] Abrindo: ${url}`);
        let browser = null;
        try {
            const wsEndpoint = process.env.BROWSERLESS_URL; // For Browserless
            if (wsEndpoint) {
                browser = await puppeteer_core_1.default.connect({ browserWSEndpoint: wsEndpoint });
            }
            else {
                // Local launch (Railway Nixpacks)
                browser = await puppeteer_core_1.default.launch({
                    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
                    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                });
            }
            const page = await browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36");
            // Otimização: Bloquear imagens, fontes e estilos para evitar travamentos e reduzir uso de memória
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
                    req.abort();
                }
                else {
                    req.continue();
                }
            });
            // networkidle2 no Google Maps causa timeout devido aos milhares de requests de telemetria/tiles.
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            // Aguardar o carregamento inicial da UI de resultados
            try {
                await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
            }
            catch (err) {
                console.warn("⚠️ [Ghost Scraper] Selector 'div[role=\"feed\"]' não encontrado a tempo. Tentando prosseguir.");
            }
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
            // Extract only relevant text from result articles to save tokens and avoid truncation
            const resultsText = await page.evaluate(() => {
                const articles = Array.from(document.querySelectorAll('div[role="article"]'));
                return articles.map(a => a.innerText).join("\n---\n");
            });
            console.log(`📄 [Ghost Scraper] Texto extraído (${resultsText.length} chars). Enviando para IA...`);
            // AI Extraction with Resilience
            const systemPrompt = `Você é um extrator de dados especialista. Analise o texto de resultados do Google Maps e extraia os leads (Nome, Telefone, Site, Categoria, Endereço).
            Retorne APENAS um JSON array de objetos: [{"name": string, "phone": string, "website": string, "category": string, "address": string}]`;
            const modelsToTry = [
                { provider: "openrouter", model: "google/gemini-2.0-flash-lite-preview-02-05:free" },
                { provider: "openrouter", model: "nvidia/llama-3.1-nemotron-70b-instruct:free" },
                { provider: "groq", model: "llama-3.3-70b-versatile" },
                { provider: "google", model: "gemini-2.0-flash" },
                { provider: "google", model: "gemini-1.5-flash-latest" }
            ];
            let aiResponse = "";
            for (const fb of modelsToTry) {
                try {
                    console.log(`🚀 [Ghost Scraper] Tentando extração com: ${fb.provider} (${fb.model})`);
                    if (fb.provider === "google") {
                        if (!process.env.GOOGLE_GEMINI_API_KEY)
                            throw new Error("GOOGLE_GEMINI_API_KEY não configurada.");
                        const currentModel = genAI.getGenerativeModel({ model: fb.model });
                        const result = await currentModel.generateContent([
                            systemPrompt,
                            { text: `Extraia os leads desta lista:\n\n${resultsText.substring(0, 50000)}` }
                        ]);
                        aiResponse = result.response.text();
                    }
                    else if (fb.provider === "openrouter") {
                        if (!process.env.OPENROUTER_API_KEY)
                            throw new Error("OPENROUTER_API_KEY não configurada.");
                        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
                            },
                            body: JSON.stringify({
                                model: fb.model,
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: `Extraia os leads desta lista:\n\n${resultsText.substring(0, 30000)}` }
                                ]
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            aiResponse = data.choices[0].message.content;
                        }
                        else {
                            throw new Error(`OpenRouter error: ${response.status} - ${await response.text()}`);
                        }
                    }
                    else if (fb.provider === "groq") {
                        if (!process.env.GROQ_API_KEY)
                            throw new Error("GROQ_API_KEY não configurada.");
                        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                            },
                            body: JSON.stringify({
                                model: fb.model,
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: `Extraia os leads desta lista:\n\n${resultsText.substring(0, 30000)}` }
                                ],
                                response_format: { type: "json_object" }
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            aiResponse = data.choices[0].message.content;
                        }
                        else {
                            throw new Error(`Groq error: ${response.status} - ${await response.text()}`);
                        }
                    }
                    if (aiResponse)
                        break;
                }
                catch (err) {
                    console.warn(`⚠️ [Ghost Scraper] Erro com ${fb.provider} (${fb.model}): ${err.message}. Tentando próximo...`);
                }
            }
            if (!aiResponse)
                throw new Error("Falha na extração de IA com todos os modelos.");
            let leads = [];
            try {
                const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();
                leads = JSON.parse(cleanedResponse);
            }
            catch (err) {
                console.error("❌ [Ghost Scraper] Erro ao parsear JSON da IA:", err);
                leads = [];
            }
            console.log(`✅ [Ghost Scraper] ${leads.length} leads encontrados.`);
            // Close browser early for efficiency
            await browser.close();
            browser = null;
            // Enrichment & Incremental Callback
            const enrichedLeads = [];
            for (const lead of leads) {
                if (!lead.name)
                    continue;
                if (!lead.phone && lead.website && lead.website.startsWith("http")) {
                    console.log(`🌐 [Enrichment] Buscando WhatsApp no site: ${lead.website}`);
                    lead.phone = await exports.ScraperService.findWhatsAppOnSite(lead.website);
                }
                enrichedLeads.push(lead);
                if (onLeadExtracted) {
                    try {
                        await onLeadExtracted(lead);
                    }
                    catch (err) {
                        console.error(`❌ [Ghost Scraper] Erro no callback onLeadExtracted para ${lead.name}:`, err);
                    }
                }
            }
            return enrichedLeads;
        }
        catch (error) {
            console.error("❌ [Ghost Scraper] Erro fatal:", error);
            if (browser)
                await browser.close();
            return [];
        }
    },
    /**
     * Finds WhatsApp on a website.
     */
    findWhatsAppOnSite: async (url) => {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
            const html = await response.text();
            // Regex Fallback (Fast)
            const whatsappRegex = /(https?:\/\/)?(api\.whatsapp\.com\/send\?phone=|wa\.me\/)([0-9]{10,13})/g;
            const matches = html.match(whatsappRegex);
            if (matches && matches.length > 0) {
                const phone = matches[0].replace(/\D/g, "");
                if (phone.length >= 10)
                    return `+${phone.startsWith("55") ? "" : "55"}${phone}`;
            }
            // AI Extraction (Smart)
            const prompt = `Encontre um WhatsApp (+55...) neste texto de site. Retorne APENAS o número formatado ou NADA. Texto:\n\n${html.substring(0, 20000)}`;
            const result = await model.generateContent(prompt);
            const phone = result.response.text().trim().replace(/\D/g, "");
            return phone.length >= 10 ? `+${phone.startsWith("55") ? "" : "55"}${phone}` : undefined;
        }
        catch {
            return undefined;
        }
    }
};
