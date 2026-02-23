import { NextRequest, NextResponse } from "next/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { AgentRepository } from "@/lib/repositories/agent";
import { AIService } from "@/lib/services/ai";
import { EvolutionService } from "@/lib/services/evolution";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Evolution API sends different types of events. We care about 'MESSAGES_UPSERT' or similar.
        // The structure usually has 'event' and 'data'.
        const event = body.event;
        const data = body.data;

        if (event !== "messages.upsert") {
            return NextResponse.json({ received: true });
        }

        const message = data.message;
        if (!message || message.key.fromMe) {
            return NextResponse.json({ received: true });
        }

        const remoteJid = message.key.remoteJid; // e.g., 5511999999999@s.whatsapp.net
        const senderNumber = remoteJid.split('@')[0];
        const textContent = message.message?.conversation || message.message?.extendedTextMessage?.text;

        if (!textContent) return NextResponse.json({ received: true });

        // 1. Identify which instance/organization this belongs to
        // Evolution API usually sends instance name in data.instance
        const instanceName = body.instance;

        // We need to find the organization that owns this instance
        // This is a bit inefficient without a lookup table, but for now we search by instanceName
        // In a real app, we'd have a mapping.

        // Simplified: Let's assume we can fetch the org from the instanceName (which contains the orgId prefix sometimes)
        // For now, we'll need to query orgs.
        // TODO: Optimize this lookup
        const allOrgs = await OrganizationRepository.getByClerkId(""); // dummy call to show we need all orgs or a filter
        // Better: Query by evolutionInstanceName
        // I'll add getByInstanceName to OrganizationRepository

        const org = await OrganizationRepository.getByInstanceName(instanceName);
        if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

        // 2. Get the active agent for this org (for now, the first one)
        const agents = await AgentRepository.listByOrgId(org.id);
        const agent = agents[0]; // TODO: Allow selecting active agent per instance

        if (!agent) return NextResponse.json({ error: "No agent configured" }, { status: 404 });

        const config = (agent.config as any) || {};

        // 3. Test Mode Filter
        if (config.testMode && config.testNumber) {
            if (senderNumber !== config.testNumber) {
                console.log(`[Webhook] Skipping message from ${senderNumber} due to Test Mode.`);
                return NextResponse.json({ skipped: true });
            }
        }

        // 4. AIService Response
        const aiResponse = await AIService.generateResponse(
            config.provider || "google",
            config.model || "gemini-1.5-flash",
            config.systemPrompt || "Você é um assistente virtual.",
            [{ role: "user", content: textContent }]
        );

        // 5. Send back via Evolution
        await EvolutionService.sendText(
            org.evolutionApiUrl!,
            org.evolutionApiKey!,
            instanceName,
            senderNumber,
            aiResponse
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
