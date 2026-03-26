import { db } from "@/lib/db";
import { messages, leads } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { withOrgContext } from "./base";

export const MessageRepository = {
    listByLead: async (leadId: string) => {
        return await withOrgContext(async (tx) => {
            return await tx.query.messages.findMany({
                where: eq(messages.leadId, leadId),
                orderBy: [desc(messages.createdAt)]
            });
        });
    },

    listByLeadSystem: async (leadId: string, limit: number = 20) => {
        return await db.query.messages.findMany({
            where: eq(messages.leadId, leadId),
            orderBy: [desc(messages.createdAt)],
            limit: limit
        });
    },

    listLatestByOrg: async () => {
        return await withOrgContext(async (tx) => {
            // USAR tx.execute em vez de db.execute para manter a transação/sessão!
            // Usando NULLIF para evitar erro de UUID vazio se a sessão falhar
            const rawResults = await tx.execute(sql`
                SELECT * FROM (
                    SELECT DISTINCT ON (m.lead_id) 
                        m.id, 
                        m.lead_id, 
                        m.role, 
                        m.content, 
                        m.created_at,
                        l.name as lead_name, 
                        l.phone as lead_phone,
                        l.last_read_at as last_read_at,
                        l.is_typing as is_typing
                    FROM messages m
                    JOIN leads l ON m.lead_id = l.id
                    WHERE l.organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
                    ORDER BY m.lead_id, m.created_at DESC
                ) sub
                ORDER BY sub.created_at DESC
            `);

            // Mapear os resultados para o formato que a UI espera
            return (rawResults as any).map((row: any) => ({
                id: row.id,
                leadId: row.lead_id,
                role: row.role,
                content: row.content,
                createdAt: row.created_at,
                lead: {
                    name: row.lead_name,
                    phone: row.lead_phone,
                    lastReadAt: row.last_read_at,
                    isTyping: row.is_typing
                }
            }));
        });
    },

    create: async (data: typeof messages.$inferInsert) => {
        return await withOrgContext(async (tx) => {
            const [newMessage] = await tx.insert(messages).values(data).returning();
            return newMessage;
        });
    },

    createSystem: async (data: typeof messages.$inferInsert) => {
        const [newMessage] = await db.insert(messages).values(data).returning();
        return newMessage;
    }
};
