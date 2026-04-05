import { db } from "../db";
import { tags, leadTags, messageTags, leads } from "../db/schema";
import { eq, and } from "drizzle-orm";

export const TagRepository = {
    listByOrg: async (organizationId: string) => {
        return db.query.tags.findMany({
            where: eq(tags.organizationId, organizationId),
            orderBy: (tags, { desc }) => [desc(tags.createdAt)],
        });
    },

    create: async (data: {
        organizationId: string;
        name: string;
        color: string;
        iconName: string;
    }) => {
        const [result] = await db.insert(tags).values(data).returning();
        return result;
    },

    delete: async (id: string) => {
        await db.delete(tags).where(eq(tags.id, id));
    },

    // -------------------------------------------------------------------------
    // Lead Tags Association
    // -------------------------------------------------------------------------
    assignToLead: async (leadId: string, tagId: string) => {
        // 1. Insert in join table
        await db.insert(leadTags).values({ leadId, tagId }).onConflictDoNothing();

        // 2. Sync to Metadata for fast FE rendering (Merging)
        const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
        if (lead) {
            const currentMetadata = (lead.metaData as any) || {};
            const currentTags = currentMetadata.tags || [];
            
            if (!currentTags.includes(tagId)) {
                await db.update(leads)
                    .set({ 
                        metaData: { ...currentMetadata, tags: [...currentTags, tagId] },
                        updatedAt: new Date()
                    })
                    .where(eq(leads.id, leadId));
            }
        }
    },

    removeFromLead: async (leadId: string, tagId: string) => {
        // 1. Delete from join table
        await db.delete(leadTags).where(
            and(eq(leadTags.leadId, leadId), eq(leadTags.tagId, tagId))
        );

        // 2. Sync to Metadata (Merging)
        const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
        if (lead) {
            const currentMetadata = (lead.metaData as any) || {};
            const currentTags = currentMetadata.tags || [];
            
            await db.update(leads)
                .set({ 
                    metaData: { ...currentMetadata, tags: currentTags.filter((id: string) => id !== tagId) },
                    updatedAt: new Date()
                })
                .where(eq(leads.id, leadId));
        }
    },

    listForLead: async (leadId: string) => {
        const results = await db.query.leadTags.findMany({
            where: eq(leadTags.leadId, leadId),
            with: {
                tag: true
            }
        });
        return results.map(r => r.tag);
    },

    // -------------------------------------------------------------------------
    // Message Tags Association
    // -------------------------------------------------------------------------
    assignToMessage: async (messageId: string, tagId: string) => {
        await db.insert(messageTags).values({ messageId, tagId }).onConflictDoNothing();
    },

    removeFromMessage: async (messageId: string, tagId: string) => {
        await db.delete(messageTags).where(
            and(eq(messageTags.messageId, messageId), eq(messageTags.tagId, tagId))
        );
    },

    listForMessages: async (messageIds: string[]) => {
        if (messageIds.length === 0) return [];
        
        const results = await db.query.messageTags.findMany({
            where: (mt, { inArray }) => inArray(mt.messageId, messageIds),
            with: {
                tag: true
            }
        });
        
        // Group tags by messageId
        const group: Record<string, any[]> = {};
        results.forEach(r => {
            if (!group[r.messageId]) group[r.messageId] = [];
            group[r.messageId].push(r.tag);
        });
        return group;
    }
};
