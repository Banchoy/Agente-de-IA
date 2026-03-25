import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users as usersTable, agents } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { Bot, UserCheck, Activity, Globe, Sparkles, Settings, TrendingUp, Users, PowerOff } from "lucide-react";
import { UserService } from "@/lib/services/user";
import CRMKanban from "./CRMKanban";
import { getKanbanData, stopOutreach } from "./leads/actions";
import { OutreachBanner } from "./leads/OutreachBanner";

export default async function DashboardPage() {
    try {
        const { userId, orgId } = await auth();

        if (!userId) redirect("/sign-in");
        if (!orgId) redirect("/org-selection");

        const dbUser = await UserService.syncUser();

        if (!dbUser || !dbUser.organizationId) {
            return (
                <div className="p-8 text-center rounded-2xl border border-amber-200 bg-amber-50">
                    <h1 className="text-xl font-bold text-amber-800">Atenção: Sincronização Pendente</h1>
                    <p className="text-amber-700">Não conseguimos vincular sua conta à organização no banco de dados. Verifique sua conexão.</p>
                </div>
            );
        }

        // Stats for CRM
        const agentCount = await db.select({ value: count() })
            .from(agents)
            .where(eq(agents.organizationId, dbUser.organizationId));

        const { leads, stages } = await getKanbanData();

        return (
            <div className="h-full flex flex-col space-y-6 overflow-hidden">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Pipeline de Vendas</h1>
                        <p className="text-muted-foreground font-medium">Gerencie seus leads e conexões do Meta Ads com IA.</p>
                    </div>

                    <div className="hidden lg:flex gap-4 items-center">
                        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm">
                            <TrendingUp size={16} className="text-green-500" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conversão: 12%</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm">
                            <Users size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leads Hoje: {leads.length}</span>
                        </div>

                        <form action={async () => {
                            "use server";
                            await stopOutreach();
                        }}>
                            <button 
                                type="submit"
                                className="flex items-center gap-2 rounded-xl bg-red-600/10 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-600/20"
                            >
                                <PowerOff size={16} />
                                Parar Disparos
                            </button>
                        </form>
                    </div>
                </div>

                <OutreachBanner />

                {/* CRM Kanban View */}
                <CRMKanban initialLeads={leads} initialStages={stages} />
            </div>
        );
    } catch (error: any) {
        console.error("Dashboard Error:", error);
        return (
            <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-red-900">
                <h1 className="text-2xl font-bold mb-2">Erro de Carregamento</h1>
                <p className="mb-4">Não foi possível carregar o dashboard. Detalhes técnicos:</p>
                <pre className="bg-red-100 p-4 rounded-lg overflow-auto text-xs font-mono max-h-96">
                    {error?.message || String(error)}
                    {"\n\nStack:\n"}
                    {error?.stack}
                </pre>
                <p className="mt-4 text-sm opacity-70 italic">Tire um print desta tela para o diagnóstico final.</p>
            </div>
        );
    }
}
