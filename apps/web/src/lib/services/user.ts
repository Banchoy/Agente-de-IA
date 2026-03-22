import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
                try {
                    [dbUser] = await db.insert(users).values({
                        clerkUserId: userId,
                        organizationId: dbOrg.id,
                        role: "member",
                    }).returning();
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
            }

            return dbUser;
        } catch (error: any) {
            console.error("SyncUser Failure:", error);
            throw new Error(`SyncUser Failed: ${error.message}`);
        }
    }
};
