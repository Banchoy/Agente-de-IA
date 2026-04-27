
import { db } from "./index";
import { sql } from "drizzle-orm";

let checkPromise: Promise<void> | null = null;

/**
 * Garante que as restrições de unicidade necessárias existam na tabela leads.
 * Utiliza um Singleton Promise para evitar concorrência.
 */
export async function ensureLeadsConstraints() {
    if (checkPromise) return checkPromise;

    checkPromise = (async () => {
        try {
            // Adicionamos verificação em pg_class para evitar conflito com índices de mesmo nome
            await db.execute(sql`
                DO $$
                BEGIN
                    -- Constraint de Telefone + Organização
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'leads_phone_org_unique'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relname = 'leads_phone_org_unique' AND n.nspname = 'public'
                    ) THEN
                        BEGIN
                            ALTER TABLE leads ADD CONSTRAINT leads_phone_org_unique UNIQUE (phone, organization_id);
                        EXCEPTION WHEN others THEN NULL;
                        END;
                    END IF;

                    -- Constraint de Email + Organização
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'leads_email_org_unique'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relname = 'leads_email_org_unique' AND n.nspname = 'public'
                    ) THEN
                        BEGIN
                            ALTER TABLE leads ADD CONSTRAINT leads_email_org_unique UNIQUE (email, organization_id);
                        EXCEPTION WHEN others THEN NULL;
                        END;
                    END IF;
                END $$;
            `);
        } catch (error: any) {
            console.error("⚠️ [Database] Erro silencioso ao verificar constraints:", error.message);
            // Resetamos a promise em caso de erro real para tentar novamente na próxima
            checkPromise = null;
        }
    })();

    return checkPromise;
}
