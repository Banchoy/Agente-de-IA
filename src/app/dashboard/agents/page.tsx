import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentRepository } from "@/lib/repositories/agent";
import { Plus, Bot, MoreVertical, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage() {
    const { userId, orgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/org-selection");

    const agents = await AgentRepository.listByOrg();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Agentes</h1>
                    <p className="text-muted-foreground">Gerencie e monitore seus agentes inteligentes.</p>
                </div>
                <Link
                    href="/dashboard/agents/new"
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Novo Agente
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {agents.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <Bot size={32} />
                        </div>
                        <h3 className="text-lg font-bold">Nenhum agente ainda</h3>
                        <p className="mb-6 text-muted-foreground">Comece criando seu primeiro agente de IA para automatizar tarefas.</p>
                        <Link
                            href="/dashboard/agents/new"
                            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition-all"
                        >
                            Criar meu primeiro agente
                        </Link>
                    </div>
                ) : (
                    agents.map((agent: any) => (
                        <div key={agent.id} className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                                    <Bot size={24} />
                                </div>
                                <button className="text-muted-foreground hover:text-foreground">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                            <h3 className="mb-1 text-lg font-bold">{agent.name}</h3>
                            <p className="mb-6 text-sm text-muted-foreground line-clamp-2">{agent.description || "Sem descrição."}</p>

                            <div className="flex items-center gap-2 mb-6">
                                <div className="flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 uppercase tracking-tighter">
                                    {agent.status}
                                </div>
                                {agent.config?.provider && (
                                    <div className="flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase tracking-tighter">
                                        {agent.config.provider}
                                    </div>
                                )}
                                {agent.config?.model && (
                                    <div className="flex items-center gap-2 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 uppercase tracking-tighter">
                                        {agent.config.model.replace('gemini-', '')}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-end">
                                <Link href={`/dashboard/agents/${agent.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <ExternalLink size={18} />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
