"use server";

import { db } from "@/lib/db";
import { leads, messages } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { LeadRepository } from "@/lib/repositories/lead";
import { withOrgContext } from "@/lib/repositories/base";

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

export async function applyCardAction(leadId: string, type: "IA" | "AGENDADO" | "AMANHA" | "PAUSA_2H") {
    try {
        const lead = await LeadRepository.getByIdSystem(leadId);
        if (!lead) return { success: false, error: "Lead não encontrado." };

        const metadata = (lead.metaData as any) || {};
        let updateData: any = {};

        switch (type) {
            case "IA":
                const currentAI = lead.aiActive === "true";
                updateData.aiActive = currentAI ? "false" : "true";
                break;
            
            case "AGENDADO":
                const { CRMRepository } = await import("@/lib/repositories/crm");
                const stage = await CRMRepository.getStageByName(lead.organizationId, "Reunião") || 
                              await CRMRepository.getStageByName(lead.organizationId, "Agendado");
                if (stage) updateData.stageId = stage;
                break;

            case "AMANHA":
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                updateData.metaData = { ...metadata, nextActionAt: tomorrow.toISOString(), aiPaused: "true" };
                break;

            case "PAUSA_2H":
                const in2h = new Date();
                in2h.setHours(in2h.getHours() + 2);
                updateData.metaData = { ...metadata, nextActionAt: in2h.toISOString(), aiPaused: "true" };
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
