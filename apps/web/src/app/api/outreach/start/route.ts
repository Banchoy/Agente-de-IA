import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { LeadRepository } from "@/lib/repositories/lead";
import { AgentRepository } from "@/lib/repositories/agent";

export async function POST(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) {
            return new NextResponse("Organization not found", { status: 404 });
        }

        const body = await req.json();
        const { stageId, leadIds } = body;

        // 1. Verificar sessão Baileys ativa
        const { WhatsappService } = await import("@/lib/services/whatsapp");
        const baileysSessionId = `wa_${org.id.slice(0, 8)}`;
        const baileysSession = WhatsappService.sessions.get(baileysSessionId);
        
        if (!baileysSession || baileysSession.status !== "open") {
            return NextResponse.json({ 
                success: false, 
                error: "WhatsApp não conectado. Conecte primeiro na página de WhatsApp." 
            }, { status: 400 });
        }

        // 2. Buscar leads elegíveis
        let leadsToContact;
        if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
            const allLeads = await LeadRepository.listByOrg();
            leadsToContact = allLeads.filter((l: any) => leadIds.includes(l.id));
        } else if (stageId) {
            const allLeads = await LeadRepository.listByOrg();
            leadsToContact = allLeads.filter((l: any) => 
                l.stageId === stageId && 
                l.phone && 
                l.outreachStatus !== "completed" && 
                l.outreachStatus !== "pending"
            );
        } else {
            return NextResponse.json({ success: false, error: "Nenhum estágio ou leads fornecidos." }, { status: 400 });
        }

        if (!leadsToContact || leadsToContact.length === 0) {
            return NextResponse.json({ success: false, error: "Nenhum lead elegível com telefone encontrado." });
        }

        // 3. Buscar Agente
        const agents = await AgentRepository.listByOrgId(org.id);
        const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];
        if (!agent) {
            return NextResponse.json({ success: false, error: "Nenhum agente configurado." }, { status: 400 });
        }

        console.log(`🚀 [API Outreach] Iniciando disparos. Org: ${org.id} | Leads: ${leadsToContact.length}`);

        // 4. Agendar Disparos (Background via OutreachService)
        let successCount = 0;
        for (const lead of leadsToContact) {
            try {
                await LeadRepository.update(lead.id, {
                    outreachStatus: "pending",
                    lastOutreachAt: null
                });
                successCount++;
            } catch (err) {
                console.error(`Erro ao agendar lead ${lead.id}:`, err);
            }
        }

        return NextResponse.json({ success: true, count: successCount });

    } catch (error: any) {
        console.error("❌ [API Outreach] Erro:", error);
        return new NextResponse(error.message || "Internal Server Error", { status: 500 });
    }
}
