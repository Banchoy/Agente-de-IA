import { db } from "@/lib/db";
import { messages, leads } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
            // This is a simplified query to get the last message for each unique lead
            // for a proper WhatsApp Web style list, we'd need more complex SQL or grouping
            return await tx.query.messages.findMany({
                orderBy: [desc(messages.createdAt)],
                limit: 50,
                with: {
                    lead: true
                }
            });
        });
    },

    create: async (data: typeof messages.$inferInsert) => {
        return await withOrgContext(async (tx) => {
            const [newMessage] = await tx.insert(messages).values(data).returning();
            return newMessage;
        });
    }
};
