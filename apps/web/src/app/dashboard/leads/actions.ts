"use server";

import { db } from "@/lib/db";
import { leads, stages, pipelines } from "@saas/db";
import { eq, and, asc } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { revalidatePath } from "next/cache";
import { LeadRepository } from "@/lib/repositories/lead";
import { AgentRepository } from "@/lib/repositories/agent";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ApifyService } from "@/lib/services/apify";
import { auth } from "@clerk/nextjs/server";

export async function listLeads() {
    try {
        return await LeadRepository.listByOrg();
    } catch (error) {
        console.error("Error listing leads:", error);
        return [];
    }
}

export async function listStages() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return [];

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return [];

        return await db.select({
            id: stages.id,
            name: stages.name,
            order: stages.order
        })
        .from(stages)
        .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
        .where(eq(pipelines.organizationId, org.id))
        .orderBy(asc(stages.order));
    } catch (error) {
        console.error("Error listing stages:", error);
        return [];
    }
}

// Simplified version for the dashboard
export async function getKanbanData() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { leads: [], stages: [] };

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { leads: [], stages: [] };

        const kanbanLeads = await LeadRepository.listByOrg();
        
        // Ensure default structure exists
        const { CRMRepository } = await import("@/lib/repositories/crm");
        await CRMRepository.ensureDefaultPipeline(org.id);

        const kanbanStages = await db.select({
            id: stages.id,
            name: stages.name,
            order: stages.order
        })
        .from(stages)
        .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
        .where(eq(pipelines.organizationId, org.id))
        .orderBy(asc(stages.order));

        return { leads: kanbanLeads, stages: kanbanStages };
    } catch (error) {
        console.error("Error getting kanban data:", error);
        return { leads: [], stages: [] };
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

export async function deleteLead(leadId: string) {
    try {
        await LeadRepository.delete(leadId);
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error deleting lead:", error);
        return { success: false, error };
    }
}

export async function updateLeadColor(leadId: string, color: string) {
    try {
        const lead = await LeadRepository.getById(leadId);
        if (!lead) throw new Error("Lead not found");

        const metaData = (lead.metaData as any) || {};
        await LeadRepository.update(leadId, {
            metaData: { ...metaData, cardColor: color }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating lead color:", error);
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

export async function startMassOutreach(stageId: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        if (!org.evolutionInstanceName || org.evolutionInstanceStatus !== "connected") {
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

export async function processProspecting(mapsUrl: string, config: { niche?: string; initialMessage?: string }) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        if (!process.env.APIFY_API_TOKEN) {
            console.warn("⚠️ [Apify] API Token não configurado no painel da Railway.");
            return { success: false, error: "Chave da API do Apify não configurada no servidor." };
        }
        
        // Disparar o Google Maps Extractor do Apify assincronamente (ele responderá no Webhook)
        ApifyService.startGoogleMapsExtractor(mapsUrl, config, org.id).catch((err: any) => {
            console.error("❌ Erro ao iniciar Apify em background:", err);
        });

        return { success: true, message: "Prospecção iniciada no Apify! Os leads aparecerão em breve no Kanban." };

    } catch (error: any) {
        console.error("Error processing prospecting:", error);
        return { success: false, error: error.message };
    }
}

export async function createStage(name: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        const { CRMRepository } = await import("@/lib/repositories/crm");
        const pipeline = await CRMRepository.ensureDefaultPipeline(org.id);

        if (!pipeline) throw new Error("Pipeline not found");

        // Get max order
        const currentStages = await db.select({ order: stages.order })
            .from(stages)
            .where(eq(stages.pipelineId, pipeline as string));
        
        const maxOrder = currentStages.reduce((max, s) => {
            const val = parseInt(s.order) || 0;
            return val > max ? val : max;
        }, 0);

        await db.insert(stages).values({
            pipelineId: pipeline as string,
            name: name,
            order: (maxOrder + 1).toString()
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error creating stage:", error);
        return { success: false, error };
    }
}

export async function deleteStage(stageId: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        // Mover leads deste estágio para o primeiro estágio disponível (Novo Lead) para não deletar os leads
        const allStages = await db.select({ id: stages.id, name: stages.name })
            .from(stages)
            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
            .where(eq(pipelines.organizationId, org.id))
            .orderBy(asc(stages.order));

        const firstStage = allStages.find(s => s.id !== stageId);
        
        if (firstStage) {
            await db.update(leads)
                .set({ stageId: firstStage.id })
                .where(eq(leads.stageId, stageId));
        }

        await db.delete(stages).where(eq(stages.id, stageId));
        
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error deleting stage:", error);
        return { success: false, error };
    }
}

export async function updateStageOrder(stageId: string, newOrder: string) {
    try {
        await db.update(stages)
            .set({ order: newOrder })
            .where(eq(stages.id, stageId));
        
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating stage order:", error);
        return { success: false, error };
    }
}
