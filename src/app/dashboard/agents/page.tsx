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
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Meus Agentes</h1>
                    <p className="text-zinc-600">Gerencie e monitore seus agentes inteligentes.</p>
                </div>
                <Link
                    href="/dashboard/agents/new"
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Novo Agente
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {agents.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                            <Bot size={32} />
                        </div>
                        <h3 className="text-lg font-bold">Nenhum agente ainda</h3>
                        <p className="mb-6 text-zinc-600">Comece criando seu primeiro agente de IA para automatizar tarefas.</p>
                        <Link
                            href="/dashboard/agents/new"
                            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 transition-all"
                        >
                            Criar meu primeiro agente
                        </Link>
                    </div>
                ) : (
                    agents.map((agent: any) => (
                        <div key={agent.id} className="group relative rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:shadow-md">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                                    <Bot size={24} />
                                </div>
                                <button className="text-zinc-400 hover:text-zinc-900">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                            <h3 className="mb-1 text-lg font-bold">{agent.name}</h3>
                            <p className="mb-6 text-sm text-zinc-600 line-clamp-2">{agent.description || "Sem descrição."}</p>

                            <div className="flex items-center gap-2 mb-6">
                                <div className="flex items-center gap-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-100 uppercase tracking-tighter">
                                    {agent.status}
                                </div>
                                {agent.config?.provider && (
                                    <div className="flex items-center gap-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100 uppercase tracking-tighter">
                                        {agent.config.provider}
                                    </div>
                                )}
                                {agent.config?.model && (
                                    <div className="flex items-center gap-2 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100 uppercase tracking-tighter">
                                        {agent.config.model.replace('gemini-', '')}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-end">
                                <Link href={`/dashboard/agents/${agent.id}`} className="text-zinc-400 hover:text-zinc-900 transition-colors">
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
