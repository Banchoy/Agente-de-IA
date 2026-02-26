
"use server";

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateLeadMetadata(leadId: string, metadata: any) {
    try {
        await db.update(leads)
            .set({
                metaData: metadata,
                updatedAt: new Date()
            })
            .where(eq(leads.id, leadId));

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating lead metadata:", error);
        return { success: false, error };
    }
}

export async function updateLeadStage(leadId: string, stageId: string) {
    try {
        await db.update(leads)
            .set({
                stageId: stageId,
                updatedAt: new Date()
            })
            .where(eq(leads.id, leadId));

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating lead stage:", error);
        return { success: false, error };
    }
}
