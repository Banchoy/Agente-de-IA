"use server";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateApiKeys(data: {
    openaiApiKey?: string | null;
    geminiApiKey?: string | null;
    openrouterApiKey?: string | null;
    apifyApiKey?: string | null;
    elevenlabsApiKey?: string | null;
}) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        throw new Error("Não autorizado");
    }

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });

    if (!org) {
        throw new Error("Organização não encontrada");
    }

    await db.update(organizations)
        .set({
            openaiApiKey: data.openaiApiKey,
            geminiApiKey: data.geminiApiKey,
            openrouterApiKey: data.openrouterApiKey,
            apifyApiKey: data.apifyApiKey,
            elevenlabsApiKey: data.elevenlabsApiKey,
        })
        .where(eq(organizations.id, org.id));

    revalidatePath("/dashboard/settings/api-keys");
    revalidatePath("/dashboard/settings");
    
    return { success: true };
}

export async function getApiKeys() {
    const { orgId } = await auth();
    if (!orgId) return null;

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
        columns: {
            openaiApiKey: true,
            geminiApiKey: true,
            openrouterApiKey: true,
            apifyApiKey: true,
            elevenlabsApiKey: true,
        }
    });

    return org;
}
