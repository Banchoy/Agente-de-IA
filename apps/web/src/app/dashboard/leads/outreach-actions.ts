"use server";

import { db } from "@/lib/db";
import { leads } from "@saas/db";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { LeadRepository } from "@/lib/repositories/lead";
import { AgentRepository } from "@/lib/repositories/agent";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { auth } from "@clerk/nextjs/server";

export async function startOutreach(leadIds?: string[]) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        // Verificar sessão Baileys ativa
        const { WhatsappService } = await import("@/lib/services/whatsapp");
        const baileysSessionId = `wa_${org.id.slice(0, 8)}`;
        const baileysSession = WhatsappService.sessions.get(baileysSessionId);
        if (!baileysSession || baileysSession.status !== "open") {
            return { success: false, error: "WhatsApp não conectado. Conecte primeiro na página de WhatsApp." };
        }

        // 1. Buscar leads
        let leadsToContact;
        if (leadIds && leadIds.length > 0) {
            // TODO: properly filter by IDs in repository
            const allLeads = await LeadRepository.listByOrg();
            leadsToContact = allLeads.filter((l: any) => leadIds.includes(l.id));
        } else {
            // Apenas os do estágio inicial (prospecção)
            const allLeads = await LeadRepository.listByOrg();
            leadsToContact = allLeads.filter((l: any) => l.stageId === "prospecting" && l.phone);
        }

        if (leadsToContact.length === 0) {
            return { success: false, error: "Nenhum lead com telefone encontrado para prospecção." };
        }

        // 2. Buscar Agente ativo para WhatsApp
        const agents = await AgentRepository.listByOrgId(org.id);
        const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];

        if (!agent) {
            return { success: false, error: "Nenhum agente configurado para prospecção." };
        }

        const config = (agent.config as any) || {};
        const systemPrompt = config.systemPrompt || "Você é um assistente virtual iniciando contato.";

        // 3. Marcar leads para prospecção (Serão processados pelo OutreachService em background)
        let successCount = 0;
        for (const lead of leadsToContact) {
            try {
                await LeadRepository.update(lead.id, {
                    outreachStatus: "pending",
                    lastOutreachAt: null // Garante que será processado na próxima volta do cron
                });
                successCount++;
            } catch (err) {
                console.error(`Erro ao agendar prospecção para ${lead.name}:`, err);
            }
        }

        revalidatePath("/dashboard");
        return { success: true, count: successCount };

    } catch (error: any) {
        console.error("Error starting outreach:", error);
        return { success: false, error: error.message };
    }
}

export async function startMassOutreach(stageId: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        // Verificar sessão Baileys ativa
        const { WhatsappService } = await import("@/lib/services/whatsapp");
        const baileysSessionId = `wa_${org.id.slice(0, 8)}`;
        const baileysSession = WhatsappService.sessions.get(baileysSessionId);
        if (!baileysSession || baileysSession.status !== "open") {
            return { success: false, error: "WhatsApp não conectado. Conecte primeiro." };
        }

        const agents = await AgentRepository.listByOrgId(org.id);
        const agent = agents.find((a: any) => a.config?.whatsappResponse === true) || agents[0];
        if (!agent) {
            return { success: false, error: "Nenhum agente configurado para prospecção." };
        }

        // Buscar leads deste stage específico que estão 'idle', 'failed' (tentar denovo) ou null. 
        // Não pegamos 'completed' (já contatado).
        const allLeads = await LeadRepository.listByOrg();
        const leadsToContact = allLeads.filter((l: any) => 
            l.stageId === stageId && 
            l.phone && 
            l.outreachStatus !== "completed" && 
            l.outreachStatus !== "pending"
        );

        console.log(`[MassOutreach] Estágio: ${stageId} | Leads Totais da Org: ${allLeads.length} | Elegíveis: ${leadsToContact.length}`);

        if (leadsToContact.length === 0) {
            return { success: false, error: "Nenhum lead elegível com telefone nesta coluna." };
        }

        let successCount = 0;
        for (const lead of leadsToContact) {
            try {
                await LeadRepository.update(lead.id, {
                    outreachStatus: "pending",
                    lastOutreachAt: null // Agenda para disparar agora
                });
                successCount++;
            } catch (err: any) {
                console.error(`Erro ao agendar fallback prospecção para ${lead.name}:`, err);
            }
        }

        revalidatePath("/dashboard");
        return { success: true, count: successCount };

    } catch (error: any) {
        console.error("Error mass outreach:", error);
        return { success: false, error: error.message };
    }
}

export async function getOutreachStatus() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { active: false };

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { active: false };

        const [pendingResult] = await db.select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(and(eq(leads.organizationId, org.id), eq(leads.outreachStatus, "pending")));

        const [completedResult] = await db.select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(and(
                eq(leads.organizationId, org.id), 
                eq(leads.outreachStatus, "completed"),
                sql`last_outreach_at > now() - interval '24 hours'`
            ));

        const pending = Number(pendingResult?.count || 0);
        const completed = Number(completedResult?.count || 0);
        const total = pending + completed;
        
        return {
            active: pending > 0,
            pending,
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    } catch (error) {
        console.error("Error getting outreach status:", error);
        return { active: false };
    }
}

export async function stopOutreach(formData?: FormData): Promise<void> {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return;

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return;

        const { inArray } = await import("drizzle-orm");
        
        await db.update(leads)
            .set({ outreachStatus: "idle" })
            .where(and(
                eq(leads.organizationId, org.id),
                inArray(leads.outreachStatus, ["pending", "processing"])
            ));
        
        revalidatePath("/dashboard/leads");
    } catch (error) {
        console.error("Error stopping outreach:", error);
    }
}
