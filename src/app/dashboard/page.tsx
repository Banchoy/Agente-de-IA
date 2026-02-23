import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users as usersTable, agents } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { Bot, UserCheck, Activity, Globe, Sparkles, Settings } from "lucide-react";
import { UserService } from "@/lib/services/user";

export default async function DashboardPage() {
    try {
        const { userId, orgId } = await auth();

        if (!userId) redirect("/sign-in");
        if (!orgId) redirect("/org-selection");

        // Sync user/org with DB and get the DB user record
        const dbUser = await UserService.syncUser();

        if (!dbUser || !dbUser.organizationId) {
            return (
                <div className="p-8 text-center rounded-2xl border border-amber-200 bg-amber-50">
                    <h1 className="text-xl font-bold text-amber-800">Atenção: Sincronização Pendente</h1>
                    <p className="text-amber-700">Não conseguimos vincular sua conta à organização no banco de dados. Verifique sua conexão.</p>
                </div>
            );
        }

        // Fetch some basic stats for the dashboard using the DB UUID
        const userCount = await db.select({ value: count() })
            .from(usersTable)
            .where(eq(usersTable.organizationId, dbUser.organizationId));

        const agentCount = await db.select({ value: count() })
            .from(agents)
            .where(eq(agents.organizationId, dbUser.organizationId));

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
                    <p className="text-zinc-600">Bem-vindo ao centro de comando dos seus agentes de IA.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-zinc-600 text-sm font-medium mb-2">
                            <Bot size={16} />
                            Agentes Ativos
                        </div>
                        <div className="text-2xl font-bold">{agentCount[0]?.value || 0}</div>
                        <div className="text-xs text-zinc-500 font-medium mt-1">Configurados no sistema</div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-zinc-600 text-sm font-medium mb-2">
                            <UserCheck size={16} />
                            Membros da Equipe
                        </div>
                        <div className="text-2xl font-bold">{userCount[0]?.value || 0}</div>
                        <div className="text-xs text-zinc-500 font-medium mt-1">Gerenciados via Clerk</div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-zinc-600 text-sm font-medium mb-2">
                            <Activity size={16} />
                            Requisições / Mês
                        </div>
                        <div className="text-2xl font-bold">142.5k</div>
                        <div className="text-xs text-zinc-500 font-medium mt-1">82% da cota utilizada</div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 text-zinc-600 text-sm font-medium mb-2">
                            <Globe size={16} />
                            Uptime
                        </div>
                        <div className="text-2xl font-bold">99.9%</div>
                        <div className="text-xs text-green-600 font-medium mt-1">Sistema estável</div>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-8">
                    <h2 className="text-xl font-bold mb-4">Próximos Passos</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200 cursor-pointer">
                            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-zinc-900 text-white">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold">Treinar Novo Agente</h4>
                                <p className="text-sm text-zinc-600">Faça o upload de documentos para dar conhecimento à sua IA.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200 cursor-pointer">
                            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                                <Settings size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold">Configurar Integrações</h4>
                                <p className="text-sm text-zinc-600">Conecte sua IA com Slack, WhatsApp ou seu CRM.</p>
                            </div>
                        </div>
                    </div>
                </div>
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
