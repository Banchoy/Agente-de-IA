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

export async function sendMessageManual(leadId: string, organizationId: string, content: string) {
    // This will be implemented to allow the human to send messages
    // and save to history.
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
