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
                if (dbOrg.clerkOrgId === "org_3DPfPGpnZXH91hE1i8ZdKNNN0rq") {
                    expectedRole = totalUsers === 0 ? "admin_test" : "vendedor_test";
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
                // Se já existir, garantir que os usuários do Henrique.org tenham as roles de teste correspondentes
                if (dbOrg.clerkOrgId === "org_3DPfPGpnZXH91hE1i8ZdKNNN0rq") {
                    const targetRole = dbUser.role === "admin" || dbUser.role === "admin_test" ? "admin_test" : "vendedor_test";
                    if (dbUser.role !== targetRole) {
                        const [updatedUser] = await db.update(users)
                            .set({ role: targetRole })
                            .where(eq(users.id, dbUser.id))
                            .returning();
                        dbUser = updatedUser;
                        console.log(`⚙️ [UserService] Role de ${userId} atualizada para ${targetRole} na org do Henrique.`);
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
