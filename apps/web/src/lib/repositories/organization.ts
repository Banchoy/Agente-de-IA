import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const OrganizationRepository = {
    getById: async (id: string) => {
        return await db.query.organizations.findFirst({
            where: eq(organizations.id, id)
        });
    },

    update: async (id: string, data: Partial<typeof organizations.$inferInsert>) => {
        const [updated] = await db.update(organizations)
            .set(data)
            .where(eq(organizations.id, id))
            .returning();
        return updated;
    },

    getByClerkId: async (clerkOrgId: string) => {
        return await db.query.organizations.findFirst({
            where: eq(organizations.clerkOrgId, clerkOrgId)
        });
    },

    getByInstanceName: async (instanceName: string) => {
        return await db.query.organizations.findFirst({
            where: eq(organizations.evolutionInstanceName, instanceName)
        });
    }
};
