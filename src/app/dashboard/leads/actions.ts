
"use server";

import { db } from "@/lib/db";
import { leads, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { LeadRepository } from "@/lib/repositories/lead";
import { AgentRepository } from "@/lib/repositories/agent";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { EvolutionService } from "@/lib/services/evolution";
import { auth } from "@clerk/nextjs/server";

export async function listLeads() {
    try {
        return await LeadRepository.listByOrg();
    } catch (error) {
        console.error("Error listing leads:", error);
        return [];
    }
}

export async function updateLeadMetadata(leadId: string, metadata: any) {
    try {
        await LeadRepository.update(leadId, {
            metaData: metadata,
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating lead metadata:", error);
        return { success: false, error };
    }
}

export async function updateLeadStage(leadId: string, stageId: string) {
    try {
        await LeadRepository.update(leadId, {
            stageId: stageId,
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating lead stage:", error);
        return { success: false, error };
    }
}

export async function createLead(data: any) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        const newLead = await LeadRepository.create({
            ...data,
            organizationId: org.id,
            aiActive: "true"
        });

        revalidatePath("/dashboard");
        return { success: true, lead: newLead };
    } catch (error) {
        console.error("Error creating lead:", error);
        return { success: false, error };
    }
}

export async function importLeads(leadsData: any[]) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        const leadsToInsert = leadsData.map(data => ({
            organizationId: org.id,
            name: data.name || "Lead Importado",
            phone: data.phone || "",
            email: data.email || "",
            stageId: data.stageId || "prospecting",
            source: data.source || "Importação",
            metaData: data.metaData || {},
            aiActive: "true"
        }));

        await LeadRepository.createMany(leadsToInsert);
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error importing leads:", error);
        return { success: false, error };
    }
}

export async function startOutreach(leadIds?: string[]) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        if (!org.evolutionInstanceName || org.evolutionInstanceStatus !== "connected") {
            return { success: false, error: "WhatsApp não conectado. Conecte primeiro." };
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
