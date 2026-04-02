import { pgTable, text, uuid, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Organizations Table
// -----------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull().unique(),
    name: text("name").notNull(),
    evolutionApiUrl: text("evolution_api_url"),
    evolutionApiKey: text("evolution_api_key"),
    evolutionInstanceStatus: text("evolution_instance_status").default("disconnected"),
    evolutionInstanceName: text("evolution_instance_name"),
    evolutionQrCode: text("evolution_qr_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Users Table
// -----------------------------------------------------------------------------
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    organizationId: uuid("organization_id")
        .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("users_organization_id_idx").on(table.organizationId),
        clerkUserIdOrgIdUnique: uniqueIndex("users_clerk_user_id_org_id_unique").on(table.clerkUserId, table.organizationId),
    }
});

// -----------------------------------------------------------------------------
// Audit Logs Table
// -----------------------------------------------------------------------------
export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Agents Table
// -----------------------------------------------------------------------------
export const agents = pgTable("agents", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("active").notNull(),
    config: jsonb("config").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    whatsappInstanceName: text("whatsapp_instance_name"),
}, (table) => {
    return {
        organizationIdIdx: index("agents_organization_id_idx").on(table.organizationId),
    }
});

// -----------------------------------------------------------------------------
// Workflows Table
// -----------------------------------------------------------------------------
export const workflows = pgTable("workflows", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    nodes: jsonb("nodes").default([]),
    edges: jsonb("edges").default([]),
    status: text("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("workflows_organization_id_idx").on(table.organizationId),
    }
});

// -----------------------------------------------------------------------------
// CRM: Pipelines Table
// -----------------------------------------------------------------------------
export const pipelines = pgTable("pipelines", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("pipelines_organization_id_idx").on(table.organizationId),
    }
});

// -----------------------------------------------------------------------------
// CRM: Stages Table
// -----------------------------------------------------------------------------
export const stages = pgTable("stages", {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineId: uuid("pipeline_id")
        .notNull()
        .references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: text("order").notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// CRM: Leads Table
// -----------------------------------------------------------------------------
export const leads = pgTable("leads", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
        .references(() => stages.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    status: text("status").default("active").notNull(),
    source: text("source"),
    metaData: jsonb("metadata").default({}),
    aiActive: text("ai_active").default("true").notNull(),
    lastReadAt: timestamp("last_read_at"),
    isTyping: text("is_typing").default("false").notNull(),
    outreachStatus: text("outreach_status").default("idle").notNull(),
    lastOutreachAt: timestamp("last_outreach_at"),
    conversationState: text("conversation_state").default("START").notNull(),
    lastIntent: text("last_intent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("leads_organization_id_idx").on(table.organizationId),
        stageIdIdx: index("leads_stage_id_idx").on(table.stageId),
        phoneOrgUnique: uniqueIndex("leads_phone_org_unique").on(table.phone, table.organizationId),
        emailOrgUnique: uniqueIndex("leads_email_org_unique").on(table.email, table.organizationId),
    }
});

export const leadsRelations = relations(leads, ({ many }) => ({
    messages: many(messages),
}));

// -----------------------------------------------------------------------------
// CRM: Meta Integrations Table
// -----------------------------------------------------------------------------
export const metaIntegrations = pgTable("meta_integrations", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    pixelId: text("pixel_id"),
    webhookVerifyToken: text("webhook_verify_token"),
    fieldMapping: jsonb("field_mapping").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// WhatsApp Sessions Table (Baileys)
// -----------------------------------------------------------------------------
export const whatsappSessions = pgTable("whatsapp_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    key: text("key").notNull(),
    data: text("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        sessionKeyUnique: uniqueIndex("whatsapp_session_key_unique").on(table.sessionId, table.key),
    }
});

// -----------------------------------------------------------------------------
// Messages Table (Chat History)
// -----------------------------------------------------------------------------
export const messages = pgTable("messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
        .references(() => leads.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    whatsappMessageId: text("whatsapp_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("messages_organization_id_idx").on(table.organizationId),
        leadIdIdx: index("messages_lead_id_idx").on(table.leadId),
        whatsappMessageIdUnique: uniqueIndex("messages_whatsapp_message_id_unique").on(table.organizationId, table.whatsappMessageId),
    }
});

export const messagesRelations = relations(messages, ({ one }) => ({
    lead: one(leads, {
        fields: [messages.leadId],
        references: [leads.id],
    }),
}));
// -----------------------------------------------------------------------------
// Tags Table (Custom Labels)
// -----------------------------------------------------------------------------
export const tags = pgTable("tags", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#3b82f6").notNull(), // hex color
    iconName: text("icon_name").default("Tag").notNull(), // lucide icon name
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("tags_organization_id_idx").on(table.organizationId),
    }
});

// -----------------------------------------------------------------------------
// Lead Tags (Many-to-Many)
// -----------------------------------------------------------------------------
export const leadTags = pgTable("lead_tags", {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
        .notNull()
        .references(() => leads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
        .notNull()
        .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        leadTagUnique: uniqueIndex("lead_tag_unique").on(table.leadId, table.tagId),
    }
});

// -----------------------------------------------------------------------------
// Message Tags (Many-to-Many)
// -----------------------------------------------------------------------------
export const messageTags = pgTable("message_tags", {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
        .notNull()
        .references(() => messages.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
        .notNull()
        .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        messageTagUnique: uniqueIndex("message_tag_unique").on(table.messageId, table.tagId),
    }
});

// -----------------------------------------------------------------------------
// RELATIONS
// -----------------------------------------------------------------------------
export const tagsRelations = relations(tags, ({ many }) => ({
    leadTags: many(leadTags),
    messageTags: many(messageTags),
}));

export const leadTagsRelations = relations(leadTags, ({ one }) => ({
    lead: one(leads, {
        fields: [leadTags.leadId],
        references: [leads.id],
    }),
    tag: one(tags, {
        fields: [leadTags.tagId],
        references: [tags.id],
    }),
}));

export const messageTagsRelations = relations(messageTags, ({ one }) => ({
    message: one(messages, {
        fields: [messageTags.messageId],
        references: [messages.id],
    }),
    tag: one(tags, {
        fields: [messageTags.tagId],
        references: [tags.id],
    }),
}));
