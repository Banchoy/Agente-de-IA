import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { organizations, leads, users } from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import MasterPanelClient from "./MasterPanelClient";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
    const { userId } = await auth();
    
    // Restrição exclusiva ao usuário master (Bruno Gustavo)
    const isMaster = userId === "user_39Wu4TqDSEQWIhZbsTmyw5WmWfM";
    if (!isMaster) {
        redirect("/dashboard");
    }

    // Carregar todas as organizações do banco
    const allOrgs = await db.query.organizations.findMany({
        orderBy: [desc(organizations.createdAt)]
    });

    // Enriquecer os dados com métricas agregadas por organização
    const orgsData = await Promise.all(
        allOrgs.map(async (org) => {
            const leadCountRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(leads)
                .where(eq(leads.organizationId, org.id));
            
            const userCountRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(users)
                .where(eq(users.organizationId, org.id));

            const activeLeadsRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(leads)
                .where(
                    and(
                        eq(leads.organizationId, org.id),
                        eq(leads.aiActive, "true")
                    )
                );

            return {
                id: org.id,
                name: org.name,
                evolutionInstanceStatus: org.evolutionInstanceStatus || "disconnected",
                subscriptionStatus: org.subscriptionStatus || "trialing",
                createdAt: org.createdAt.toISOString(),
                leadCount: Number(leadCountRes[0]?.count || 0),
                userCount: Number(userCountRes[0]?.count || 0),
                activeLeads: Number(activeLeadsRes[0]?.count || 0)
            };
        })
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Painel Master 👑
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Acompanhamento geral de clientes, conexões de WhatsApp e performance global do sistema.
                </p>
            </div>

            <MasterPanelClient initialOrgs={orgsData} />
        </div>
    );
}
