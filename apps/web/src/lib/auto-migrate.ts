import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function runAutoMigration() {
    try {
        console.log("🔍 [AutoMigrate] Verificando se o banco de dados precisa de migração...");
        
        // Verifica se a tabela 'leads' existe
        const result = await (db as any).execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'leads'
            );
        `);
        
        const exists = result[0]?.exists;
        
        if (exists) {
            console.log("✅ [AutoMigrate] O banco de dados já possui as tabelas. Verificando colunas incrementais...");
            await applyIncrementalColumns();
            return;
        }

        console.log("⚠️ [AutoMigrate] Tabelas ausentes. Executando migração completa (Railway Inicial)...");
        
        const queries = [
            `CREATE TABLE IF NOT EXISTS "audit_logs" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "action" text NOT NULL, "metadata" jsonb, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "organizations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "clerk_org_id" text NOT NULL, "name" text NOT NULL, "evolution_api_url" text, "evolution_api_key" text, "evolution_instance_status" text DEFAULT 'disconnected', "evolution_instance_name" text, "evolution_qr_code" text, "openai_api_key" text, "gemini_api_key" text, "openrouter_api_key" text, "apify_api_key" text, "elevenlabs_api_key" text, "resend_api_key" text, "prospecting_config" jsonb DEFAULT '{}'::jsonb, "routing_config" jsonb DEFAULT '{}'::jsonb, "subscription_status" text DEFAULT 'trialing', "stripe_customer_id" text, "stripe_subscription_id" text, "plan_id" text, "created_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id"));`,
            `CREATE TABLE IF NOT EXISTS "users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "clerk_user_id" text NOT NULL, "organization_id" uuid, "role" text, "openai_api_key" text, "gemini_api_key" text, "openrouter_api_key" text, "apify_api_key" text, "elevenlabs_api_key" text, "resend_api_key" text, "created_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "users_clerk_user_id_org_id_unique" UNIQUE("clerk_user_id","organization_id"));`,
            `CREATE TABLE IF NOT EXISTS "agents" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "name" text NOT NULL, "description" text, "status" text DEFAULT 'active' NOT NULL, "config" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, "whatsapp_instance_name" text);`,
            `CREATE TABLE IF NOT EXISTS "lead_tags" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "lead_id" uuid NOT NULL, "tag_id" uuid NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "leads" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "stage_id" uuid, "assigned_user_id" uuid, "name" text NOT NULL, "email" text, "phone" text, "status" text DEFAULT 'active' NOT NULL, "source" text, "metadata" jsonb DEFAULT '{}'::jsonb, "ai_active" text DEFAULT 'true' NOT NULL, "last_read_at" timestamp, "is_typing" text DEFAULT 'false' NOT NULL, "outreach_status" text DEFAULT 'idle' NOT NULL, "last_outreach_at" timestamp, "conversation_state" text DEFAULT 'START' NOT NULL, "last_intent" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "message_tags" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "message_id" uuid NOT NULL, "tag_id" uuid NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "messages" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "lead_id" uuid, "role" text NOT NULL, "content" text NOT NULL, "whatsapp_message_id" text, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "meta_integrations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "access_token" text, "pixel_id" text, "webhook_verify_token" text, "field_mapping" jsonb DEFAULT '{}'::jsonb, "integrated_forms" jsonb DEFAULT '[]'::jsonb, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "pipelines" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "name" text NOT NULL, "description" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "stages" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "pipeline_id" uuid NOT NULL, "name" text NOT NULL, "order" text DEFAULT '0' NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "tags" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "name" text NOT NULL, "color" text DEFAULT '#3b82f6' NOT NULL, "icon_name" text DEFAULT 'Tag' NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "whatsapp_sessions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "session_id" text NOT NULL, "key" text NOT NULL, "data" text NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);`,
            `CREATE TABLE IF NOT EXISTS "workflows" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "organization_id" uuid NOT NULL, "name" text NOT NULL, "description" text, "nodes" jsonb DEFAULT '[]'::jsonb, "edges" jsonb DEFAULT '[]'::jsonb, "status" text DEFAULT 'draft' NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);`,
            `DO $$ BEGIN ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "message_tags" ADD CONSTRAINT "message_tags_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "message_tags" ADD CONSTRAINT "message_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "meta_integrations" ADD CONSTRAINT "meta_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "stages" ADD CONSTRAINT "stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "tags" ADD CONSTRAINT "tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `DO $$ BEGIN ALTER TABLE "workflows" ADD CONSTRAINT "workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
            `CREATE INDEX IF NOT EXISTS "users_organization_id_idx" ON "users" USING btree ("organization_id");`,
            `CREATE INDEX IF NOT EXISTS "agents_organization_id_idx" ON "agents" USING btree ("organization_id");`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "lead_tag_unique" ON "lead_tags" USING btree ("lead_id","tag_id");`,
            `CREATE INDEX IF NOT EXISTS "leads_organization_id_idx" ON "leads" USING btree ("organization_id");`,
            `CREATE INDEX IF NOT EXISTS "leads_stage_id_idx" ON "leads" USING btree ("stage_id");`,
            `CREATE INDEX IF NOT EXISTS "leads_assigned_user_id_idx" ON "leads" USING btree ("assigned_user_id");`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "leads_phone_org_unique" ON "leads" USING btree ("phone","organization_id");`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "message_tag_unique" ON "message_tags" USING btree ("message_id","tag_id");`,
            `CREATE INDEX IF NOT EXISTS "messages_organization_id_idx" ON "messages" USING btree ("organization_id");`,
            `CREATE INDEX IF NOT EXISTS "messages_lead_id_idx" ON "messages" USING btree ("lead_id");`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "messages_whatsapp_message_id_unique" ON "messages" USING btree ("organization_id","whatsapp_message_id");`,
            `CREATE INDEX IF NOT EXISTS "pipelines_organization_id_idx" ON "pipelines" USING btree ("organization_id");`,
            `CREATE INDEX IF NOT EXISTS "tags_organization_id_idx" ON "tags" USING btree ("organization_id");`,
            `CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_session_key_unique" ON "whatsapp_sessions" USING btree ("session_id","key");`,
            `CREATE INDEX IF NOT EXISTS "workflows_organization_id_idx" ON "workflows" USING btree ("organization_id");`
        ];

        for (const query of queries) {
            await (db as any).execute(sql.raw(query));
        }

        console.log("✅ [AutoMigrate] Todas as tabelas foram criadas com sucesso! Aplicando colunas adicionais...");
        await applyIncrementalColumns();
        
    } catch (err) {
        console.error("❌ [AutoMigrate] Erro ao executar migração automática:", err);
    }
}

async function applyIncrementalColumns() {
    const alterQueries = [
        `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "resend_api_key" text;`,
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resend_api_key" text;`,
        `ALTER TABLE "meta_integrations" ADD COLUMN IF NOT EXISTS "integrated_forms" jsonb DEFAULT '[]'::jsonb;`
    ];

    for (const query of alterQueries) {
        try {
            await (db as any).execute(sql.raw(query));
        } catch (alterErr) {
            console.error(`⚠️ [AutoMigrate] Falha ao executar alter query: ${query}`, alterErr);
        }
    }
}
