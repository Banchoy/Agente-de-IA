"use server";

import { db } from "@/lib/db";
import { leads, messages, tags } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { MessageRepository } from "@/lib/repositories/message";
import { LeadRepository } from "@/lib/repositories/lead";
import { TagRepository } from "@/lib/repositories/tag";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { auth } from "@clerk/nextjs/server";
import { withOrgContext } from "@/lib/repositories/base";
import { revalidatePath } from "next/cache";

export async function toggleLeadAI(leadId: string, active: boolean) {
    try {
        await LeadRepository.update(leadId, {
            aiActive: active ? "true" : "false"
        });
        revalidatePath("/dashboard/chats");
        return { success: true };
    } catch (error) {
        console.error("Error toggling lead AI:", error);
        return { success: false, error };
    }
}

export async function sendMessageManual(leadId: string, content: string) {
    if (!content?.trim()) return { success: false, error: "Mensagem vazia." };

    try {
        const { auth } = await import("@clerk/nextjs/server");
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return { success: false, error: "Não autorizado." };

        const { OrganizationRepository } = await import("@/lib/repositories/organization");
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { success: false, error: "Organização não encontrada." };

        // Buscar lead para obter o telefone
        const { LeadRepository } = await import("@/lib/repositories/lead");
        const lead = await (LeadRepository as any).getByIdSystem(leadId);
        if (!lead) return { success: false, error: "Lead não encontrado." };

        if (!lead.phone) return { success: false, error: "Lead sem número de telefone." };

        // Enviar via Baileys (WhatsApp real)
        const { WhatsappService } = await import("@/lib/services/whatsapp");
        await WhatsappService.sendText(org.id, lead.phone, content.trim());

        // Salvar no histórico manualmente
        const { MessageRepository } = await import("@/lib/repositories/message");
        await (MessageRepository as any).createSystem({
            organizationId: org.id,
            leadId: lead.id,
            role: "assistant",
            content: content.trim(),
            type: "text",
            whatsappMessageId: `manual_${Date.now()}`,
        });

        // Desativar IA para este lead (handover humano)
        await LeadRepository.updateSystem(lead.id, { aiActive: "false" });

        revalidatePath("/dashboard/chats");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao enviar mensagem manual:", error);
        return { success: false, error: error.message || "Erro técnico." };
    }
}

export async function deleteChats(leadIds: string[]) {
    try {
        await withOrgContext(async (tx) => {
            if (leadIds.length === 0) return;
            // Apaga apenas as mensagens (preserva o lead e seu histórico no CRM)
            await tx.delete(messages).where(inArray(messages.leadId, leadIds));
        });
        revalidatePath("/dashboard/chats");
        return { success: true, deleted: leadIds.length };
    } catch (error) {
        console.error("Erro ao apagar conversas:", error);
        return { success: false, error };
    }
}

export async function applyCardAction(leadId: string, type: "IA" | "PARAR_IA" | "AGENDADO" | "AMANHA" | "PAUSA_2H") {
    try {
        const lead = await LeadRepository.getByIdSystem(leadId);
        if (!lead) return { success: false, error: "Lead não encontrado." };

        const metadata = (lead.metaData as any) || {};
        let updateData: any = {};

        switch (type) {
            case "IA":
                // Arrastar "Ligar IA" sempre ATIVA a IA
                updateData.aiActive = "true";
                updateData.metaData = { ...metadata, aiPaused: "false", activeCard: "IA" };
                break;
            
            case "PARAR_IA":
                // Arrastar "Parar IA" sempre DESATIVA a IA (handover humano)
                updateData.aiActive = "false";
                updateData.metaData = { ...metadata, aiPaused: "true", activeCard: "PARAR_IA" };
                break;

            case "AGENDADO":
                const { CRMRepository } = await import("@/lib/repositories/crm");
                const stage = await CRMRepository.getStageByName(lead.organizationId, "Reunião") || 
                              await CRMRepository.getStageByName(lead.organizationId, "Agendado");
                if (stage) updateData.stageId = stage;
                updateData.metaData = { ...metadata, activeCard: "AGENDADO" };
                break;

            case "AMANHA":
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                updateData.metaData = { ...metadata, nextActionAt: tomorrow.toISOString(), aiPaused: "true", activeCard: "AMANHA" };
                break;

            case "PAUSA_2H":
                const in2h = new Date();
                in2h.setHours(in2h.getHours() + 2);
                updateData.metaData = { ...metadata, nextActionAt: in2h.toISOString(), aiPaused: "true", activeCard: "PAUSA_2H" };
                break;
        }

        await LeadRepository.updateSystem(leadId, updateData);
        revalidatePath("/dashboard/chats");
        return { success: true };
    } catch (error) {
        console.error("Erro ao aplicar card:", error);
        return { success: false, error };
    }
}

// -----------------------------------------------------------------------------
// Tag Actions
// -----------------------------------------------------------------------------

export async function createTag(data: { name: string, color: string, iconName: string }) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) return { success: false, error: "Organização não encontrada." };

    const tag = await TagRepository.create({
        ...data,
        organizationId: org.id
    });

    revalidatePath("/dashboard/chats");
    return { success: true, tag };
}

export async function deleteTag(tagId: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    await TagRepository.delete(tagId);
    revalidatePath("/dashboard/chats");
    return { success: true };
}

export async function assignTagToLead(leadId: string, tagId: string) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return { success: false, error: "Não autorizado." };

        // 1. Atribui a tag (já faz o merge automático no repositório)
        await TagRepository.assignToLead(leadId, tagId);

        // 2. Busca a tag para verificar se é "mágica"
        const tag = await db.query.tags.findFirst({ where: eq(tags.id, tagId) });
        if (tag) {
            const tagName = tag.name.toLowerCase();
            
            // 3. Aplica automações baseadas no nome da tag
            if (tagName.includes('parar ia') || tagName.includes('parar atendimento')) {
                await LeadRepository.updateSystem(leadId, { 
                    aiActive: "false",
                    metaData: { aiPaused: "true", activeCard: "PARAR_IA" }
                });
            } else if (tagName.includes('pausa 2h') || tagName.includes('pausar 2h')) {
                const in2h = new Date();
                in2h.setHours(in2h.getHours() + 2);
                await LeadRepository.updateSystem(leadId, { 
                    metaData: { 
                        nextActionAt: in2h.toISOString(), 
                        aiPaused: "true", 
                        activeCard: "PAUSA_2H" 
                    } 
                });
            }
        }

        revalidatePath("/dashboard/chats");
        return { success: true };
    } catch (error) {
        console.error("Erro ao atribuir tag:", error);
        return { success: false, error };
    }
}

export async function assignTagToMessage(messageId: string, tagId: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    await TagRepository.assignToMessage(messageId, tagId);
    revalidatePath("/dashboard/chats");
    return { success: true };
}

export async function removeTagFromLead(leadId: string, tagId: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    await TagRepository.removeFromLead(leadId, tagId);
    revalidatePath("/dashboard/chats");
    return { success: true };
}

export async function deleteTags(tagIds: string[]) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return { success: false, error: "Não autorizado." };

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { success: false, error: "Organização não encontrada." };

        // 1. Remover as etiquetas do banco de dados (Bulk)
        await TagRepository.deleteMany(tagIds, org.id);

        // 2. Limpar as referências nas leads (remover IDs de tags que não existem mais)
        const orgLeads = await LeadRepository.listByOrg();
        
        for (const lead of orgLeads) {
            const metadata = (lead.metaData as any) || {};
            const currentTags = metadata.tags || [];
            
            const hasDeletedTag = currentTags.some((id: string) => tagIds.includes(id));
            if (hasDeletedTag) {
                const newTags = currentTags.filter((id: string) => !tagIds.includes(id));
                await LeadRepository.updateSystem(lead.id, {
                    metaData: { ...metadata, tags: newTags }
                });
            }
        }

        revalidatePath("/dashboard/chats");
        return { success: true };
    } catch (error) {
        console.error("Erro ao excluir etiquetas:", error);
        return { success: false, error };
    }
}
