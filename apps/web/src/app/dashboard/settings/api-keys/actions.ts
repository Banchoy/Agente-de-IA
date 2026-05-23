"use server";

import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function updateApiKeys(data: {
    openaiApiKey?: string | null;
    geminiApiKey?: string | null;
    openrouterApiKey?: string | null;
    apifyApiKey?: string | null;
    elevenlabsApiKey?: string | null;
    resendApiKey?: string | null;
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

    const dbUser = await db.query.users.findFirst({
        where: and(
            eq(users.clerkUserId, userId),
            eq(users.organizationId, org.id)
        )
    });

    if (!dbUser) {
        throw new Error("Usuário não encontrado");
    }

    if (dbUser.role === "vendedor" || dbUser.role === "member") {
        console.log(`🔑 [Settings API] Atualizando chaves de API individuais do vendedor: ${dbUser.id}`);
        await db.update(users)
            .set({
                openaiApiKey: data.openaiApiKey,
                geminiApiKey: data.geminiApiKey,
                openrouterApiKey: data.openrouterApiKey,
                apifyApiKey: data.apifyApiKey,
                elevenlabsApiKey: data.elevenlabsApiKey,
                resendApiKey: data.resendApiKey,
            })
            .where(eq(users.id, dbUser.id));
    } else {
        console.log(`🔑 [Settings API] Atualizando chaves de API globais da organização: ${org.id}`);
        await db.update(organizations)
            .set({
                openaiApiKey: data.openaiApiKey,
                geminiApiKey: data.geminiApiKey,
                openrouterApiKey: data.openrouterApiKey,
                apifyApiKey: data.apifyApiKey,
                elevenlabsApiKey: data.elevenlabsApiKey,
                resendApiKey: data.resendApiKey,
            })
            .where(eq(organizations.id, org.id));
    }

    revalidatePath("/dashboard/settings/api-keys");
    revalidatePath("/dashboard/settings");
    
    return { success: true };
}

export async function getApiKeys() {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) return null;

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
        columns: {
            openaiApiKey: true,
            geminiApiKey: true,
            openrouterApiKey: true,
            apifyApiKey: true,
            elevenlabsApiKey: true,
            resendApiKey: true,
        }
    });

    if (!org) return null;

    const dbUser = await db.query.users.findFirst({
        where: and(
            eq(users.clerkUserId, userId),
            eq(users.organizationId, org.id)
        )
    });

    if (!dbUser) return org;

    if (dbUser.role === "vendedor" || dbUser.role === "member") {
        console.log(`🔑 [Settings API] Obtendo chaves de API individuais do vendedor: ${dbUser.id}`);
        return {
            openaiApiKey: dbUser.openaiApiKey,
            geminiApiKey: dbUser.geminiApiKey,
            openrouterApiKey: dbUser.openrouterApiKey,
            apifyApiKey: dbUser.apifyApiKey,
            elevenlabsApiKey: dbUser.elevenlabsApiKey,
            resendApiKey: dbUser.resendApiKey,
        };
    }

    console.log(`🔑 [Settings API] Obtendo chaves de API globais da organização: ${org.openaiApiKey ? 'Configuradas' : 'Não configuradas'}`);
    return org;
}
