
import { NextRequest, NextResponse } from "next/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
import { LeadRepository } from "@/lib/repositories/lead";
import { MessageRepository } from "@/lib/repositories/message";
import { CRMRepository } from "@/lib/repositories/crm";
import { AIService } from "@/lib/services/ai";
import { EvolutionService } from "@/lib/services/evolution";
import { TTSService } from "@/lib/services/tts";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, instance, data } = body;

        // 1. Basic validation
        if (event !== "messages.upsert") {
            return NextResponse.json({ received: true });
        }

        const message = data.message;
        const key = data.key;

        if (!message || key.fromMe) {
            return NextResponse.json({ received: true });
        }

        const remoteJid = key.remoteJid;
        if (!remoteJid || (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid"))) {
            return NextResponse.json({ received: true });
        }

        const text = message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption;
        if (!text) {
            return NextResponse.json({ received: true });
        }

        // 2. Identify Organization
        const org = await OrganizationRepository.getByInstanceName(instance);
        if (!org) {
            console.warn(`⚠️ Organization not found for instance: ${instance}`);
            return NextResponse.json({ error: "Org not found" }, { status: 404 });
        }

        // 3. Find or Create Lead
        const rawPhone = remoteJid.split("@")[0];
        const phone = rawPhone; // Mantemos o nome da variável para compatibilidade
        
        console.log(`🌐 [Evolution] Validating JID: ${remoteJid} -> Phone: ${phone}`);
        let lead = await LeadRepository.getByPhoneSystem(phone, org.id);
        
        if (!lead) {
            console.log(`🆕 Creating new lead for phone: ${phone}`);
            // Ensure default pipeline exists
            await CRMRepository.ensureDefaultPipeline(org.id);
            const initialStageId = await CRMRepository.getStageByName(org.id, "Novo Lead");
            
            // Lógica de detecção de fonte: se o nome ou conteúdo sugere prospecção, podemos marcar como Outreach
            const nameLower = (data.pushName || "").toLowerCase();
            const isLikelyOutreach = nameLower.includes("vendas") || nameLower.includes("comercial") || nameLower.includes("negócios");

            lead = await LeadRepository.createSystem({
                organizationId: org.id,
                name: data.pushName || phone,
                phone: phone,
                source: isLikelyOutreach ? "Outreach" : "WhatsApp (Inbound)",
                stageId: initialStageId,
                conversationState: "START",
                aiActive: "true"
            });
        } else {
            console.log(`✅ Existing lead found: ${lead.name} [Source: ${lead.source}]`);
        }

        // 4. Salvar Mensagem no Histórico (Sempre, mesmo se a IA estiver desativada)
        await MessageRepository.createSystem({
            organizationId: org.id,
            leadId: lead.id,
            role: "user",
            content: text
        });

        // 5. Check if AI is active for this lead
        const metadata = (lead.metaData as any) || {};
        const now = new Date();
        const nextAction = metadata.nextActionAt ? new Date(metadata.nextActionAt) : null;

        if (lead.aiActive === "false") {
            console.log(`🔇 AI inactive for lead: ${phone}. Histórico salvo.`);
            return NextResponse.json({ received: true });
        }

        if (nextAction && now < nextAction) {
            console.log(`⏳ AI paused for lead ${phone} until ${nextAction.toISOString()}. Histórico salvo.`);
            return NextResponse.json({ received: true });
        }

        // 5. Get Active Agent
        const agents = await AgentRepository.listByOrgId(org.id);
        const whatsappAgent = agents.find((a: any) => a.config?.whatsappResponse === true);

        if (!whatsappAgent) {
            return NextResponse.json({ received: true });
        }

        const config = (whatsappAgent.config as any) || {};

        // 6. Load History
        const history = await MessageRepository.listByLeadSystem(lead.id, 10);
        const formattedHistory = history.reverse().map(m => ({
            role: m.role as "user" | "model",
            content: m.content
        }));

        // 7. Generate Structured AI Response
        console.log(`🤖 Agent "${whatsappAgent.name}" processing logic for state: ${lead.conversationState}`);
        
        const systemPromptToUse = config.systemPrompt || "Você é o Bruno, um especialista em vendas experiente.";

        const structuredResult = await AIService.generateStructuredResponse(
            config.provider || "google",
            config.model || "gemini-1.5-flash",
            systemPromptToUse,
            [...formattedHistory, { role: "user", content: text }],
            lead.conversationState || "START",
            { 
                name: lead.name, 
                phone: lead.phone, 
                source: lead.source,
                ...(lead.metaData as object) 
            },
            config.temperature || 0.7
        );

        const { body: aiBody, nextState, intent, action, extractedInfo } = structuredResult;

        // Mensagem já salva no início do processamento para garantir histórico total

        // 9. Automated Actions (CRM Movement)
        let stageToUpdate = lead.stageId;
        if (action === "SCHEDULE_MEETING") {
            console.log(`📅 Action: Moving lead ${phone} to Meeting stage.`);
            const meetingStage = await CRMRepository.getStageByName(org.id, "Reunião");
            if (meetingStage) {
                stageToUpdate = meetingStage;
            }
        }

        // 10. Update Lead
        const { ScriptService } = await import("@/lib/services/script");
        const nextConversationState = await ScriptService.advanceState(lead.conversationState, lead, structuredResult);
        
        await LeadRepository.updateSystem(lead.id, {
            conversationState: nextConversationState,
            lastIntent: intent,
            stageId: stageToUpdate,
            metaData: {
                ...(lead.metaData as object),
                ...extractedInfo,
                updatedByAIAt: new Date().toISOString()
            }
        });

        // 11. Save AI Response
        await MessageRepository.createSystem({
            organizationId: org.id,
            leadId: lead.id,
            role: "model",
            content: aiBody
        });

        // 12. Send Response (Split Voice and Text)
        console.log(`📤 Sending funnel response (${nextState}) to ${remoteJid}`);
        
        const apiUrl = org.evolutionApiUrl || process.env.EVOLUTION_API_URL || "";
        const apiKey = org.evolutionApiKey || process.env.EVOLUTION_API_KEY || "";

        // Regex for [AUDIO] or [ÁUDIO] tags
        const audioRegex = /\[(?:AUDIO|ÁUDIO)\]([\s\S]*?)\[\/(?:AUDIO|ÁUDIO)\]/gi;
        
        let lastIndex = 0;
        let match;
        const messages: { type: "text" | "audio", content: string }[] = [];

        while ((match = audioRegex.exec(aiBody)) !== null) {
            // Text before the audio tag
            const textBefore = aiBody.substring(lastIndex, match.index).trim();
            if (textBefore) {
                messages.push({ type: "text", content: textBefore });
            }
            // Audio content
            const audioContent = match[1].trim();
            if (audioContent) {
                messages.push({ type: "audio", content: audioContent });
            }
            lastIndex = audioRegex.lastIndex;
        }

        // Remaining text after last tag
        const remainingText = aiBody.substring(lastIndex).trim();
        if (remainingText) {
            messages.push({ type: "text", content: remainingText });
        }

        // If no tags were found, send entire body as text (or audio if enabled)
        if (messages.length === 0) {
            messages.push({ type: config.voiceEnabled ? "audio" : "text", content: aiBody });
        }

        // Sequential sending
        for (const msg of messages) {
            if (msg.type === "audio" && config.voiceEnabled) {
                try {
                    const audioData = await TTSService.generateAudio(
                        msg.content,
                        config.ttsProvider || "openai",
                        config.ttsVoiceId,
                        config.coquiUrl
                    );
                    await EvolutionService.sendAudio(apiUrl, apiKey, instance, phone, audioData);
                } catch (ttsErr) {
                    console.error("❌ TTS Error, falling back to text:", ttsErr);
                    await EvolutionService.sendText(apiUrl, apiKey, instance, phone, msg.content);
                }
            } else {
                // Remove any remaining tags just in case
                const cleanText = msg.content.replace(/\[\/?(?:AUDIO|ÁUDIO)\]/gi, "").trim();
                if (cleanText) {
                    await EvolutionService.sendText(apiUrl, apiKey, instance, phone, cleanText);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("❌ Error in Evolution Webhook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
