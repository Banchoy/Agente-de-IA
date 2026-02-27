
import { pgTable, text, uuid, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Users Table
// -----------------------------------------------------------------------------
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(), // Maps to Clerk User ID
    organizationId: uuid("organization_id")
        .references(() => organizations.id, { onDelete: "cascade" }), // Can be null if user doesn't have an active org context yet, but for multi-tenant SaaS usually mandatory in context
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
        .references(() => organizations.id, { onDelete: "cascade" }), // Always tied to an org
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
    status: text("status").default("active").notNull(), // e.g., active, training, inactive
    config: jsonb("config").default({}), // For AI-specific configuration
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
    status: text("status").default("draft").notNull(), // draft, active, inactive
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
    order: text("order").notNull().default("0"), // To maintain kanban column order
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
    phone: text("phone"), // International format for WhatsApp
    status: text("status").default("active").notNull(), // active, closed, lost
    source: text("source"), // e.g., 'meta_ads', 'manual'
    metaData: jsonb("metadata").default({}), // Unified metadata storage (AI extracted info, campaign info)
    aiActive: text("ai_active").default("true").notNull(), // 'true' or 'false' for handover
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        organizationIdIdx: index("leads_organization_id_idx").on(table.organizationId),
        stageIdIdx: index("leads_stage_id_idx").on(table.stageId),
    }
});

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
    fieldMapping: jsonb("field_mapping").default({}), // Mapping of Facebook form fields to CRM fields
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
