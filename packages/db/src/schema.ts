import { pgTable, text, uuid, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Organizations Table
// -----------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull().unique(), // Maps to Clerk Organization ID
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
    clerkUserId: text("clerk_user_id").notNull(), // Maps to Clerk User ID
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("leads_organization_id_idx").on(table.organizationId),
        stageIdIdx: index("leads_stage_id_idx").on(table.stageId),
    }
});

export const leadsRelations = relations(leads, ({ many }) => ({
    messages: many(messages),
}));

// -----------------------------------------------------------------------------
// Messages Table
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("messages_organization_id_idx").on(table.organizationId),
        leadIdIdx: index("messages_lead_id_idx").on(table.leadId),
    }
});
