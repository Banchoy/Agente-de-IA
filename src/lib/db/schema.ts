
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
