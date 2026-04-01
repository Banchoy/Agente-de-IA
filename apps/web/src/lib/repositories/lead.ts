
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { withOrgContext } from "./base";

export const LeadRepository = {
    listByOrg: async () => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findMany({
                orderBy: (l: any, { desc }: any) => [desc(l.updatedAt)]
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

    getByIdSystem: async (id: string) => {
        return await db.query.leads.findFirst({
            where: eq(leads.id, id)
        });
    },

    getByPhoneSystem: async (phone: string, organizationId: string) => {
        // 1. Sanitização rigorosa do telefone de entrada
        const cleanPhone = phone.replace(/\D/g, "");
        
        // 2. Tenta busca exata com o número limpo
        let lead = await db.query.leads.findFirst({
            where: and(
                eq(leads.phone, cleanPhone),
                eq(leads.organizationId, organizationId)
            )
        });

        if (lead) return lead;

        // 3. Busca Resiliente para Números do Brasil (Divergência de 9º dígito)
        if (cleanPhone.startsWith("55") && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
            const ddd = cleanPhone.substring(2, 4);
            const body = cleanPhone.substring(4);
            
            let alternativePhone: string | null = null;
            
            if (cleanPhone.length === 13 && body.startsWith("9")) {
                // Tem 9 dígito, tenta sem
                alternativePhone = `55${ddd}${body.substring(1)}`;
            } else if (cleanPhone.length === 12) {
                // Não tem 9 dígito, tenta com
                alternativePhone = `55${ddd}9${body}`;
            }

            if (alternativePhone) {
                console.log(`🔍 [LeadRepository] Tentando busca resiliente: ${cleanPhone} -> ${alternativePhone}`);
                lead = await db.query.leads.findFirst({
                    where: and(
                        eq(leads.phone, alternativePhone),
                        eq(leads.organizationId, organizationId)
                    )
                });
            }
        }

        return lead;
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
    },

    getAnalyticsStats: async (organizationId: string) => {
        const { sql } = await import("drizzle-orm");
        
        // 1. Leads por Estágio
        const stageStats = await db
            .select({
                stageId: leads.stageId,
                count: sql<number>`count(*)`
            })
            .from(leads)
            .where(eq(leads.organizationId, organizationId))
            .groupBy(leads.stageId);

        // 2. Leads nos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isoDateStr = sevenDaysAgo.toISOString();
        
        const last7Days = await db
            .select({
                date: sql<string>`DATE(created_at)`,
                count: sql<number>`count(*)`
            })
            .from(leads)
            .where(and(
                eq(leads.organizationId, organizationId),
                sql`created_at >= ${isoDateStr}`
            ))
            .groupBy(sql`DATE(created_at)`)
            .orderBy(sql`DATE(created_at)`);

        // 3. Totais rápidos
        const [totals] = await db
            .select({
                total: sql<number>`count(*)`,
                today: sql<number>`count(*) filter (where created_at >= CURRENT_DATE)`,
                converted: sql<number>`count(*) filter (where stage_id in (select id from stages where name ilike '%vendido%'))`
            })
            .from(leads)
            .where(eq(leads.organizationId, organizationId));

        return {
            stageStats,
            last7Days,
            totals: {
                total: Number(totals?.total || 0),
                today: Number(totals?.today || 0),
                converted: Number(totals?.converted || 0)
            }
        };
    }
};
