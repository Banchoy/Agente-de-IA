import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, UserCheck, Activity, Globe } from "lucide-react";

export default async function DashboardPage() {
    const { userId, orgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/org-selection");

    // Fetch some basic stats for the dashboard
    const userCount = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.organizationId, orgId));

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
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs text-green-600 font-medium mt-1">+2 desde ontem</div>
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
}
