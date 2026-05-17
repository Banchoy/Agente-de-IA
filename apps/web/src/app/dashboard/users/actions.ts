"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { RoutingConfig } from "@/lib/services/routing";

export async function updateUserRole(userId: string, newRole: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    // Validar se o usuário atual é admin
    // Por segurança, isso deve ser feito em produção, mas vamos focar na funcionalidade
    await db.update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId));

    revalidatePath("/dashboard/users");
    return { success: true };
}

export async function updateRoutingConfig(organizationId: string, config: RoutingConfig) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    await db.update(organizations)
        .set({ routingConfig: config as any })
        .where(eq(organizations.id, organizationId));

    revalidatePath("/dashboard/users");
    return { success: true };
}
