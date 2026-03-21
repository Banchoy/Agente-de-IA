"use server";

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { LeadRepository } from "@/lib/repositories/lead";

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
