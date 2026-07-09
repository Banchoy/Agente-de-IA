import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { LeadRepository } from "@/lib/repositories/lead";
import { AgentRepository } from "@/lib/repositories/agent";
import { CRMRepository } from "@/lib/repositories/crm";

import { db } from "@/lib/db";
import { whatsappSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

        // 1. Buscar Agente
        const agents = await AgentRepository.listByOrgId(org.id);
        const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];
        if (!agent) {
            return NextResponse.json({ success: false, error: "Nenhum agente configurado." }, { status: 400 });
        }

        // 2. Determinar a sessão de WhatsApp ativa do agente ou da org
        let baileysSessionId = agent.whatsappInstanceName;
        if (!baileysSessionId) {
            const dbSessions = await db.select({ sessionId: whatsappSessions.sessionId })
                .from(whatsappSessions)
                .where(eq(whatsappSessions.organizationId, org.id))
                .limit(1);
            if (dbSessions.length > 0) {
                baileysSessionId = dbSessions[0].sessionId;
            }
        }

        if (!baileysSessionId) {
            return NextResponse.json({ 
                success: false, 
                error: "Nenhuma sessão de WhatsApp configurada. Conecte seu WhatsApp primeiro." 
            }, { status: 400 });
        }

        // Verificar sessão Baileys ativa em memória
        const { WhatsappService } = await import("@/lib/services/whatsapp");
        const baileysSession = WhatsappService.sessions.get(baileysSessionId);
        
        if (!baileysSession || baileysSession.status !== "open") {
            return NextResponse.json({ 
                success: false, 
                error: "WhatsApp não conectado. Conecte primeiro na página de WhatsApp." 
            }, { status: 400 });
        }

        // 3. Buscar leads elegíveis
        let leadsToContact;
        if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
            const allLeads = await LeadRepository.listByOrg();
            leadsToContact = allLeads.filter((l: any) => leadIds.includes(l.id));
        } else if (stageId) {
            const allLeads = await LeadRepository.listByOrg();
            leadsToContact = allLeads.filter((l: any) => 
                l.stageId === stageId && 
                l.phone && 
                l.outreachStatus !== "pending" &&
                l.outreachStatus !== "processing"
            );
        } else {
            return NextResponse.json({ success: false, error: "Nenhum estágio ou leads fornecidos." }, { status: 400 });
        }

        if (!leadsToContact || leadsToContact.length === 0) {
            return NextResponse.json({ success: false, error: "Nenhum lead elegível com telefone encontrado." });
        }

        const agentConfig = (agent?.config as any) || {};
        const isModo2 = agentConfig.outreachMode === "2";
        const novoLeadStageId = await CRMRepository.getStageByName(org.id, "Novo Lead");

        if (isModo2 && stageId === novoLeadStageId) {
            console.log(`🔍 [API Outreach] Rodando Varredura Rápida (Modo 2). Org: ${org.id} | Leads: ${leadsToContact.length}`);
            const qualificacaoStageId = await CRMRepository.getStageByName(org.id, "Qualificação");
            if (!qualificacaoStageId) {
                return NextResponse.json({ success: false, error: "Estágio de Qualificação não encontrado no CRM." }, { status: 400 });
            }

            let validCount = 0;
            let invalidCount = 0;

            for (const lead of leadsToContact) {
                if (!lead.phone) continue;
                try {
                    // Validar número via Baileys
                    const isValid = await WhatsappService.isValidNumber(org.id, lead.phone);
                    if (isValid) {
                        await LeadRepository.update(lead.id, {
                            stageId: qualificacaoStageId,
                            outreachStatus: "idle",
                            lastOutreachAt: new Date()
                        });
                        validCount++;
                    } else {
                        await LeadRepository.update(lead.id, {
                            outreachStatus: "failed_invalid_contact"
                        });
                        invalidCount++;
                    }
                    // Pequeno delay anti-flood/anti-freeze
                    await new Promise(r => setTimeout(r, 400));
                } catch (err) {
                    console.error(`Erro ao varrer lead ${lead.id} (${lead.phone}):`, err);
                }
            }

            return NextResponse.json({ 
                success: true, 
                scan: true, 
                count: validCount, 
                message: `Varredura concluída! ${validCount} leads válidos foram movidos para a Qualificação. ${invalidCount} números inválidos identificados.` 
            });
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
