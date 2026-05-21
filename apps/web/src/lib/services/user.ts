import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

export const UserService = {
    syncUser: async () => {
        try {
            const { userId, orgId } = await auth();
            const user = await currentUser();

            if (!userId || !orgId || !user) {
                console.warn("SyncUser - Missing Clerk context:", { userId, orgId, hasUser: !!user });
                return null;
            }

            // 1. Check if organization exists in our DB, if not create it
            let dbOrg = await db.query.organizations.findFirst({
                where: eq(organizations.clerkOrgId, orgId),
            });

            if (!dbOrg) {
                try {
                    const [newOrg] = await db.insert(organizations).values({
                        clerkOrgId: orgId,
                        name: user.firstName ? `${user.firstName}'s Org` : "Nova Organização",
                    }).returning();
                    dbOrg = newOrg;
                } catch (insertOrgErr) {
                    console.error("SyncUser - Error inserting org:", insertOrgErr);
                    // Re-check if it was created by another parallel request
                    dbOrg = await db.query.organizations.findFirst({
                        where: eq(organizations.clerkOrgId, orgId),
                    });
                    if (!dbOrg) throw insertOrgErr;
                }
            }

            // 2. Check if user exists in our DB within this org
            let dbUser = await db.query.users.findFirst({
                where: and(
                    eq(users.clerkUserId, userId),
                    eq(users.organizationId, dbOrg.id)
                ),
            });

            if (!dbUser) {
                // Contar usuários existentes na organização
                const existingUsers = await db.select({ value: sql<number>`count(*)` })
                    .from(users)
                    .where(eq(users.organizationId, dbOrg.id));
                const totalUsers = Number(existingUsers[0]?.value || 0);
                
                let expectedRole = totalUsers === 0 ? "admin" : "vendedor";
                if (userId === "user_39Wu4TqDSEQWIhZbsTmyw5WmWfM") {
                    expectedRole = "master";
                }
                
                // Se for um novo vendedor (totalUsers > 0), vamos verificar se o administrador é do tipo teste ("admin_test")
                if (totalUsers > 0) {
                    const hasAdminTest = await db.query.users.findFirst({
                        where: and(
                            eq(users.organizationId, dbOrg.id),
                            eq(users.role, "admin_test")
                        )
                    });
                    if (hasAdminTest) {
                        expectedRole = "vendedor_test";
                    }
                }
 
                try {
                    [dbUser] = await db.insert(users).values({
                        clerkUserId: userId,
                        organizationId: dbOrg.id,
                        role: expectedRole,
                    }).returning();
                    console.log(`🆕 [UserService] Novo usuário ${userId} inserido na org ${dbOrg.id} com a role: ${expectedRole}`);
                } catch (insertUserErr) {
                    console.error("SyncUser - Error inserting user:", insertUserErr);
                    dbUser = await db.query.users.findFirst({
                        where: and(
                            eq(users.clerkUserId, userId),
                            eq(users.organizationId, dbOrg.id)
                        ),
                    });
                    if (!dbUser) throw insertUserErr;
                }
            } else {
                // Se o usuário já existe, e for um vendedor, garante que a role esteja sincronizada com o status do administrador
                if (dbUser.role === "vendedor" || dbUser.role === "vendedor_test") {
                    const hasAdminTest = await db.query.users.findFirst({
                        where: and(
                            eq(users.organizationId, dbOrg.id),
                            eq(users.role, "admin_test")
                        )
                    });
                    const targetRole = hasAdminTest ? "vendedor_test" : "vendedor";
                    if (dbUser.role !== targetRole) {
                        const [updatedUser] = await db.update(users)
                            .set({ role: targetRole })
                            .where(eq(users.id, dbUser.id))
                            .returning();
                        dbUser = updatedUser;
                        console.log(`⚙️ [UserService] Role de vendedor ${userId} atualizada dinamicamente para ${targetRole}.`);
                    }
                }
            }

            return dbUser;
        } catch (error: any) {
            console.error("SyncUser Failure:", error);
            throw new Error(`SyncUser Failed: ${error.message}`);
        }
    }
};
