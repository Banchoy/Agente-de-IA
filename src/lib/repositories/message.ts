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

    listLatestByOrg: async () => {
        return await withOrgContext(async (tx) => {
            // Usando SQL puro com DISTINCT ON para garantir uma linha por lead_id
            // Utilizamos current_setting('app.current_org_id') que foi definido no withOrgContext
            const rawResults = await db.execute(sql`
                SELECT DISTINCT ON (m.lead_id) 
                    m.id, 
                    m.lead_id, 
                    m.role, 
                    m.content, 
                    m.created_at,
                    l.name as lead_name, 
                    l.phone as lead_phone
                FROM messages m
                JOIN leads l ON m.lead_id = l.id
                WHERE l.organization_id = current_setting('app.current_org_id')::uuid
                ORDER BY m.lead_id, m.created_at DESC
            `);

            // Mapear os resultados para o formato que a UI espera
            // O resultado do db.execute varia conforme o driver, em postgres-js são as linhas diretamente
            return (rawResults as any).map((row: any) => ({
                id: row.id,
                leadId: row.lead_id,
                role: row.role,
                content: row.content,
                createdAt: row.created_at,
                lead: {
                    name: row.lead_name,
                    phone: row.lead_phone
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
