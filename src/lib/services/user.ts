import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

export const UserService = {
    syncUser: async () => {
        const { userId, orgId } = await auth();
        const user = await currentUser();

        if (!userId || !orgId || !user) return null;

        // 1. Check if organization exists in our DB, if not create it
        let dbOrg = await db.query.organizations.findFirst({
            where: eq(organizations.clerkOrgId, orgId),
        });

        if (!dbOrg) {
            const [newOrg] = await db.insert(organizations).values({
                clerkOrgId: orgId,
                name: "Nova Organização", // Ideally get from Clerk Organization object if available
            }).returning();
            dbOrg = newOrg;
        }

        // 2. Check if user exists in our DB within this org
        let dbUser = await db.query.users.findFirst({
            where: and(
                eq(users.clerkUserId, userId),
                eq(users.organizationId, dbOrg.id)
            ),
        });

        if (!dbUser) {
            [dbUser] = await db.insert(users).values({
                clerkUserId: userId,
                organizationId: dbOrg.id,
                role: "member", // Default role
            }).returning();
        }

        return dbUser;
    }
};
