
import { db } from "./index";
import { sql } from "drizzle-orm";

let constraintsChecked = false;

/**
 * Garante que as restrições de unicidade necessárias existam na tabela leads.
 * Isso resolve o erro 42P10 (missing unique constraint).
 */
export async function ensureLeadsConstraints() {
    if (constraintsChecked) return;

    try {
        console.log("🔍 [Database] Verificando constraints da tabela 'leads'...");
        
        // Usamos um bloco PL/pgSQL para verificar e criar as constraints de forma atômica e segura
        await db.execute(sql`
            DO $$
            BEGIN
                -- Constraint de Telefone + Organização
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'leads_phone_org_unique'
                ) THEN
                    ALTER TABLE leads ADD CONSTRAINT leads_phone_org_unique UNIQUE (phone, organization_id);
                    RAISE NOTICE 'Constraint leads_phone_org_unique criada.';
                END IF;

                -- Constraint de Email + Organização
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'leads_email_org_unique'
                ) THEN
                    ALTER TABLE leads ADD CONSTRAINT leads_email_org_unique UNIQUE (email, organization_id);
                    RAISE NOTICE 'Constraint leads_email_org_unique criada.';
                END IF;
            END $$;
        `);

        console.log("✅ [Database] Constraints de leads verificadas/criadas com sucesso.");
        constraintsChecked = true;
    } catch (error: any) {
        console.error("❌ [Database] Erro ao garantir constraints:", error.message);
        // Não travamos o sistema, mas o erro persistirá até ser corrigido manualmente no console
    }
}
