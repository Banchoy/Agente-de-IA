"use server";

import { db } from "@/lib/db";
import { leads, stages, pipelines } from "@saas/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { revalidatePath } from "next/cache";
import { LeadRepository } from "@/lib/repositories/lead";
import { AgentRepository } from "@/lib/repositories/agent";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ApifyService } from "@/lib/services/apify";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { normalizePhone } from "@/lib/utils/phone";

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
        
        console.log(`📊 [Kanban] Org Clerk: ${clerkOrgId} | Org DB: ${org.id} | Leads recuperados: ${kanbanLeads.length}`);
        
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

        const cleanPhone = data.phone ? String(data.phone).replace(/\D/g, "") : "";

        const newLead = await LeadRepository.create({
            ...data,
            organizationId: org.id,
            phone: cleanPhone,
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

        const leadsToInsert = leadsData.map(data => {
            const cleanPhone = data.phone ? String(data.phone).replace(/\D/g, "") : "";
            return {
                organizationId: org.id,
                name: data.name || "Lead Importado",
                phone: cleanPhone,
                email: data.email || "",
                stageId: data.stageId || "prospecting",
                source: data.source || "Importação",
                metaData: data.metaData || {},
                aiActive: "true"
            };
        });

        await LeadRepository.createMany(leadsToInsert);
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error importing leads:", error);
        return { success: false, error };
    }
}





export async function processProspecting(mapsUrl: string, config: { 
    niche?: string; 
    initialMessage?: string;
    minRating?: string;
    minReviews?: string;
    maxItems?: string;
}) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        if (!process.env.APIFY_API_TOKEN) {
            console.warn("⚠️ [Apify] API Token não configurado no painel da Railway.");
            return { success: false, error: "Chave da API do Apify não configurada no servidor." };
        }
        
        // Determinar URL base dinâmica baseada primariamente na variável de ambiente.
        // O `host` header no Railway/Vercel às vezes retorna o domínio interno, o que quebra o Webhook.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agente-de-ia-production-5eb7.up.railway.app";

        // Disparar o Google Maps Extractor do Apify assincronamente (ele responderá no Webhook)
        const run = await ApifyService.startGoogleMapsExtractor(mapsUrl, config, org.id, baseUrl);

        return { 
            success: true, 
            runId: run.id,
            message: "Prospecção iniciada no Apify! Acompanhando progresso..." 
        };

    } catch (error: any) {
        console.error("Error processing prospecting:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca o progresso da prospecção e sincroniza itens parciais no banco.
 */
export async function getProspectingProgress(runId: string, clientNiche?: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Unauthorized" };

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { success: false, error: "Organization not found" };

        const run = await ApifyService.getRunStatus(runId);
        if (!run) return { success: false, error: "Run not found" };

        const items = await ApifyService.getDatasetItems(run.defaultDatasetId);
        const configNiche = clientNiche || run.customData?.config?.niche;
        
        // Garantir estrutura de CRM
        const { CRMRepository } = await import("@/lib/repositories/crm");
        const qualificationStageId = await CRMRepository.ensureDefaultPipeline(org.id);

        // Sincronizar itens parciais (Idempotente)
        for (const item of items) {
            const leadName = item.title || item.name || "Lead Maps";
            
            // Normalizar Telefone usando utilidade global
            const rawPhone = item.phoneUnformatted || item.phone || item.phoneNumber || item.phoneNumberStandardized || "";
            const phone = normalizePhone(rawPhone);

            // Mapeamento Robusto de E-mail (Múltiplas fontes possíveis do Apify)
            const email = (
                item.email || 
                (Array.isArray(item.emails) ? item.emails[0] : item.emails) || 
                (Array.isArray(item.contactEmails) ? item.contactEmails[0] : item.contactEmails) || 
                item.contactInfo?.email ||
                item.contactInfo?.emails?.[0] ||
                item.emailsFromWebsite?.[0] ||
                item.emails_from_website?.[0] ||
                item.websiteEmails?.[0] ||
                item.contact_emails?.[0] ||
                item.extradata?.email ||
                item.personalEmail ||
                ""
            ).toString().toLowerCase().trim();
            
            if (!phone && !email) continue;

            const leadValues = {
                organizationId: org.id,
                name: leadName,
                phone: phone || null,
                email: email || null,
                source: "Google Maps",
                stageId: qualificationStageId || null,
                metaData: {
                    ...item,
                    website: item.website || item.url || "",
                    niche: configNiche || ""
                },
                aiActive: "true"
            };

            await LeadRepository.upsertSystem(leadValues);
        }

        return { 
            success: true, 
            status: run.status, 
            itemCount: items.length,
            leads: items.slice(-5).map((it: any) => ({ 
                name: it.title || it.name, 
                phone: it.phone || it.phoneNumber || "",
                email: it.email || (Array.isArray(it.emails) ? it.emails[0] : "")
            }))
        };
    } catch (error: any) {
        console.error("Error getting progress:", error);
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




/**
 * Recupera estatísticas reais para o dashboard e analytics.
 */
export async function getDashboardAnalytics() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    try {
        const { OrganizationRepository } = await import("@/lib/repositories/organization");
        const { LeadRepository } = await import("@/lib/repositories/lead");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { success: false, error: "Organização não encontrada." };

        const stats = await LeadRepository.getAnalyticsStats(org.id);
        const { stages } = await getKanbanData();

        // 1. Formatar funil
        const funnelData = stages.map(s => {
            const count = stats.stageStats.find(ss => ss.stageId === s.id)?.count || 0;
            return {
                name: s.name,
                value: Number(count),
                fill: s.name.toLowerCase().includes("venda") || s.name.toLowerCase().includes("vendido") ? "#10b981" : "#3b82f6"
            };
        });

        // 2. Formatar histórico (últimos 7 dias)
        // Criar um array com os últimos 7 dias para garantir que todos os dias apareçam (mesmo com 0)
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = stats.last7Days.find(sd => sd.date === dateStr);
            days.push({
                name: d.toLocaleDateString("pt-BR", { weekday: "short" }),
                leads: found ? Number(found.count) : 0
            });
        }

        // 3. Taxa de conversão
        const total = stats.totals.total || 0;
        const converted = stats.totals.converted || 0;
        const conversionRate = total > 0 
            ? ((converted / total) * 100).toFixed(1)
            : "0";

        return {
            success: true,
            stats: {
                totalLeads: total,
                leadsToday: stats.totals.today,
                conversionRate: `${conversionRate}%`,
                funnelData,
                leadsOverTime: days
            }
        };
    } catch (error: any) {
        console.error("❌ [Analytics Action] Erro:", error);
        return { success: false, error: error.message };
    }
}

