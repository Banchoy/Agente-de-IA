
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { withOrgContext } from "./base";

export const LeadRepository = {
    listByOrg: async () => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findMany({
                orderBy: (l: any, { desc }: any) => [desc(l.createdAt)]
            });
        });
    },

    getById: async (id: string) => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findFirst({
                where: eq(leads.id, id)
            });
        });
    },

    getByPhone: async (phone: string) => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findFirst({
                where: eq(leads.phone, phone)
            });
        });
    },

    create: async (data: typeof leads.$inferInsert) => {
        return await withOrgContext(async (tx) => {
            const [newLead] = await tx.insert(leads).values(data).returning();
            return newLead;
        });
    },

    createMany: async (data: (typeof leads.$inferInsert)[]) => {
        return await withOrgContext(async (tx) => {
            const results = await tx.insert(leads).values(data).returning();
            return results;
        });
    },

    update: async (id: string, data: Partial<typeof leads.$inferInsert>) => {
        return await withOrgContext(async (tx) => {
            const [updatedLead] = await tx.update(leads)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(leads.id, id))
                .returning();
            return updatedLead;
        });
    },

    delete: async (id: string) => {
        return await withOrgContext(async (tx) => {
            await tx.delete(leads).where(eq(leads.id, id));
        });
    }
};
