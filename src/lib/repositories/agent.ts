import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { withOrgContext } from "./base";

export const AgentRepository = {
    listByOrg: async () => {
        return await withOrgContext(async (tx) => {
            return await tx.query.agents.findMany();
        });
    },

    getById: async (id: string) => {
        return await withOrgContext(async (tx) => {
            return await tx.query.agents.findFirst({
                where: eq(agents.id, id)
            });
        });
    },

    create: async (data: typeof agents.$inferInsert) => {
        return await withOrgContext(async (tx) => {
            const [newAgent] = await tx.insert(agents).values(data).returning();
            return newAgent;
        });
    },

    update: async (id: string, data: Partial<typeof agents.$inferInsert>) => {
        return await withOrgContext(async (tx) => {
            const [updatedAgent] = await tx.update(agents)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(agents.id, id))
                .returning();
            return updatedAgent;
        });
    },

    delete: async (id: string) => {
        return await withOrgContext(async (tx) => {
            await tx.delete(agents).where(eq(agents.id, id));
        });
    }
};
