require("dotenv").config();
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  // Primeiro, garantir que as colunas existem
  try {
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing'`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id text`;
    await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id text`;
    console.log("✅ Colunas de billing criadas/verificadas");
  } catch (e) {
    console.log("⚠️ Colunas podem já existir:", e.message);
  }

  // Agora ativar as orgs reais
  const res = await sql`
    UPDATE organizations 
    SET subscription_status = 'active', plan_id = 'anual'
    WHERE clerk_org_id IN ('org_3DPfPGpnZXH91hE1i8ZdKNNN0rq', 'org_3A4rnCwnfmBSLXRPpd7JIY87vux')
    RETURNING id, name, subscription_status, plan_id
  `;
  console.log("✅ Organizações ativadas:");
  res.forEach(r => console.log(`  - ${r.name}: status=${r.subscription_status}, plan=${r.plan_id}`));
  
  await sql.end();
}

main().catch(console.error);
