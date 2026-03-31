
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

    getByPhoneSystem: async (phone: string, organizationId: string) => {
        return await db.query.leads.findFirst({
            where: and(
                eq(leads.phone, phone),
                eq(leads.organizationId, organizationId)
            )
        });
    },

    create: async (data: typeof leads.$inferInsert) => {
        return await withOrgContext(async (tx) => {
            const [newLead] = await tx.insert(leads).values(data).returning();
            return newLead;
        });
    },

    createSystem: async (data: typeof leads.$inferInsert) => {
        const { ensureLeadsConstraints } = await import("@/lib/db/ensure-constraints");
        await ensureLeadsConstraints();
        
        const [newLead] = await db.insert(leads).values(data).returning();
        return newLead;
    },

    upsertSystem: async (data: typeof leads.$inferInsert) => {
        const { sql } = await import("drizzle-orm");
        const { ensureLeadsConstraints } = await import("@/lib/db/ensure-constraints");
        
        // Garante que o banco de dados tenha as constraints necessárias (Self-Healing)
        await ensureLeadsConstraints();

        if (data.phone) {
            // Priority: Phone
            const [lead] = await db.insert(leads)
                .values(data)
                .onConflictDoUpdate({
                    target: [leads.phone, leads.organizationId],
                    set: {
                        name: data.name,
                        email: data.email || sql`leads.email`,
                        stageId: data.stageId || sql`leads.stage_id`,
                        metaData: data.metaData,
                        updatedAt: new Date()
                    }
                })
                .returning();
            
            if (lead) {
                console.log(`✅ [LeadRepository] Lead upsertado por telefone: ${lead.name} [ID: ${lead.id}]`);
            }
            return lead;
        } else if (data.email) {
            // Fallback: Email
            const [lead] = await db.insert(leads)
                .values(data)
                .onConflictDoUpdate({
                    target: [leads.email, leads.organizationId],
                    set: {
                        name: data.name,
                        stageId: data.stageId || sql`leads.stage_id`,
                        metaData: data.metaData,
                        updatedAt: new Date()
                    }
                })
                .returning();
            
            if (lead) {
                console.log(`✅ [LeadRepository] Lead upsertado por e-mail: ${lead.name} [ID: ${lead.id}]`);
            }
            return lead;
        }
        
        // Se não tiver nenhum dos dois, apenas insere
        const [newLead] = await db.insert(leads).values(data).returning();
        return newLead;
    },

    updateSystem: async (id: string, data: Partial<typeof leads.$inferInsert>) => {
        const [updatedLead] = await db.update(leads)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(leads.id, id))
            .returning();
        return updatedLead;
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
            return updatedLead || null;
        });
    },

    delete: async (id: string) => {
        return await withOrgContext(async (tx) => {
            await tx.delete(leads).where(eq(leads.id, id));
        });
    },

    getInactiveLeads: async (days: number) => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - days);

        // Busca leads sem atualização há X dias
        return await db.query.leads.findMany({
            where: (l: any, { lt }: any) => lt(l.updatedAt, threshold),
            limit: 100
        });
    },

    deleteSystem: async (id: string) => {
        await db.delete(leads).where(eq(leads.id, id));
    }
};
