"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRelations = exports.messages = exports.whatsappSessions = exports.metaIntegrations = exports.leadsRelations = exports.leads = exports.stages = exports.pipelines = exports.workflows = exports.agents = exports.auditLogs = exports.users = exports.organizations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// -----------------------------------------------------------------------------
// Organizations Table
// -----------------------------------------------------------------------------
exports.organizations = (0, pg_core_1.pgTable)("organizations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    clerkOrgId: (0, pg_core_1.text)("clerk_org_id").notNull().unique(),
    name: (0, pg_core_1.text)("name").notNull(),
    evolutionApiUrl: (0, pg_core_1.text)("evolution_api_url"),
    evolutionApiKey: (0, pg_core_1.text)("evolution_api_key"),
    evolutionInstanceStatus: (0, pg_core_1.text)("evolution_instance_status").default("disconnected"),
    evolutionInstanceName: (0, pg_core_1.text)("evolution_instance_name"),
    evolutionQrCode: (0, pg_core_1.text)("evolution_qr_code"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// -----------------------------------------------------------------------------
// Users Table
// -----------------------------------------------------------------------------
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    clerkUserId: (0, pg_core_1.text)("clerk_user_id").notNull(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.text)("role"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: (0, pg_core_1.index)("users_organization_id_idx").on(table.organizationId),
        clerkUserIdOrgIdUnique: (0, pg_core_1.uniqueIndex)("users_clerk_user_id_org_id_unique").on(table.clerkUserId, table.organizationId),
    };
});
// -----------------------------------------------------------------------------
// Audit Logs Table
// -----------------------------------------------------------------------------
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    action: (0, pg_core_1.text)("action").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// -----------------------------------------------------------------------------
// Agents Table
// -----------------------------------------------------------------------------
exports.agents = (0, pg_core_1.pgTable)("agents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    status: (0, pg_core_1.text)("status").default("active").notNull(),
    config: (0, pg_core_1.jsonb)("config").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    whatsappInstanceName: (0, pg_core_1.text)("whatsapp_instance_name"),
}, (table) => {
    return {
        organizationIdIdx: (0, pg_core_1.index)("agents_organization_id_idx").on(table.organizationId),
    };
});
// -----------------------------------------------------------------------------
// Workflows Table
// -----------------------------------------------------------------------------
exports.workflows = (0, pg_core_1.pgTable)("workflows", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    nodes: (0, pg_core_1.jsonb)("nodes").default([]),
    edges: (0, pg_core_1.jsonb)("edges").default([]),
    status: (0, pg_core_1.text)("status").default("draft").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: (0, pg_core_1.index)("workflows_organization_id_idx").on(table.organizationId),
    };
});
// -----------------------------------------------------------------------------
// CRM: Pipelines Table
// -----------------------------------------------------------------------------
exports.pipelines = (0, pg_core_1.pgTable)("pipelines", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: (0, pg_core_1.index)("pipelines_organization_id_idx").on(table.organizationId),
    };
});
// -----------------------------------------------------------------------------
// CRM: Stages Table
// -----------------------------------------------------------------------------
exports.stages = (0, pg_core_1.pgTable)("stages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id")
        .notNull()
        .references(() => exports.pipelines.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    order: (0, pg_core_1.text)("order").notNull().default("0"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// -----------------------------------------------------------------------------
// CRM: Leads Table
// -----------------------------------------------------------------------------
exports.leads = (0, pg_core_1.pgTable)("leads", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    stageId: (0, pg_core_1.uuid)("stage_id")
        .references(() => exports.stages.id, { onDelete: "set null" }),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email"),
    phone: (0, pg_core_1.text)("phone"),
    status: (0, pg_core_1.text)("status").default("active").notNull(),
    source: (0, pg_core_1.text)("source"),
    metaData: (0, pg_core_1.jsonb)("metadata").default({}),
    aiActive: (0, pg_core_1.text)("ai_active").default("true").notNull(),
    lastReadAt: (0, pg_core_1.timestamp)("last_read_at"),
    isTyping: (0, pg_core_1.text)("is_typing").default("false").notNull(),
    outreachStatus: (0, pg_core_1.text)("outreach_status").default("idle").notNull(),
    lastOutreachAt: (0, pg_core_1.timestamp)("last_outreach_at"),
    conversationState: (0, pg_core_1.text)("conversation_state").default("START").notNull(),
    lastIntent: (0, pg_core_1.text)("last_intent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: (0, pg_core_1.index)("leads_organization_id_idx").on(table.organizationId),
        stageIdIdx: (0, pg_core_1.index)("leads_stage_id_idx").on(table.stageId),
    };
});
exports.leadsRelations = (0, drizzle_orm_1.relations)(exports.leads, ({ many }) => ({
    messages: many(exports.messages),
}));
// -----------------------------------------------------------------------------
// CRM: Meta Integrations Table
// -----------------------------------------------------------------------------
exports.metaIntegrations = (0, pg_core_1.pgTable)("meta_integrations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    accessToken: (0, pg_core_1.text)("access_token"),
    pixelId: (0, pg_core_1.text)("pixel_id"),
    webhookVerifyToken: (0, pg_core_1.text)("webhook_verify_token"),
    fieldMapping: (0, pg_core_1.jsonb)("field_mapping").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// -----------------------------------------------------------------------------
// WhatsApp Sessions Table (Baileys)
// -----------------------------------------------------------------------------
exports.whatsappSessions = (0, pg_core_1.pgTable)("whatsapp_sessions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    sessionId: (0, pg_core_1.text)("session_id").notNull(),
    key: (0, pg_core_1.text)("key").notNull(),
    data: (0, pg_core_1.text)("data").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        sessionKeyUnique: (0, pg_core_1.uniqueIndex)("whatsapp_session_key_unique").on(table.sessionId, table.key),
    };
});
// -----------------------------------------------------------------------------
// Messages Table (Chat History)
// -----------------------------------------------------------------------------
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    organizationId: (0, pg_core_1.uuid)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    leadId: (0, pg_core_1.uuid)("lead_id")
        .references(() => exports.leads.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.text)("role").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: (0, pg_core_1.index)("messages_organization_id_idx").on(table.organizationId),
        leadIdIdx: (0, pg_core_1.index)("messages_lead_id_idx").on(table.leadId),
    };
});
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    lead: one(exports.leads, {
        fields: [exports.messages.leadId],
        references: [exports.leads.id],
    }),
}));
