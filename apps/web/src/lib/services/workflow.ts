import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const WorkflowService = {
    async listByOrganization(organizationId: string) {
        return await db.select()
            .from(workflows)
            .where(eq(workflows.organizationId, organizationId))
            .orderBy(workflows.createdAt);
    },

    async getById(id: string, organizationId: string) {
        const result = await db.select()
            .from(workflows)
            .where(and(
                eq(workflows.id, id),
                eq(workflows.organizationId, organizationId)
            ))
            .limit(1);

        return result[0] || null;
    },

    async create(data: { name: string; description?: string; organizationId: string }) {
        const result = await db.insert(workflows)
            .values({
                ...data,
                nodes: [],
                edges: [],
                status: "draft"
            })
            .returning();

        return result[0];
    },

    async update(id: string, organizationId: string, data: Partial<typeof workflows.$inferInsert>) {
        const result = await db.update(workflows)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(and(
                eq(workflows.id, id),
                eq(workflows.organizationId, organizationId)
            ))
            .returning();

        return result[0];
    },

    async delete(id: string, organizationId: string) {
        return await db.delete(workflows)
            .where(and(
                eq(workflows.id, id),
                eq(workflows.organizationId, organizationId)
            ));
    }
};
