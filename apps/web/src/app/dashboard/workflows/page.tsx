import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { WorkflowService } from "@/lib/services/workflow";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { Share2, Plus, ArrowRight, Activity, Calendar } from "lucide-react";
import Link from "next/link";
import { createWorkflow } from "./actions";

export default async function WorkflowsPage() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) redirect("/sign-in");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) redirect("/org-selection");

        const workflows = await WorkflowService.listByOrganization(org.id);

        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fluxos de Automação</h1>
                        <p className="text-muted-foreground">Combine agentes e ferramentas para criar processos automáticos.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Create New Card */}
                    <div className="group relative rounded-2xl border-2 border-dashed border-border p-8 transition-all hover:border-primary hover:bg-accent/50">
                        <form action={createWorkflow} className="flex flex-col h-full justify-between gap-4">
                            <div className="space-y-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground group-hover:scale-110 transition-transform">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Novo Fluxo</h3>
                                    <p className="text-sm text-muted-foreground">Arraste nós e conecte agendes para automatizar tarefas.</p>
                                </div>
                                <div className="space-y-2">
                                    <input
                                        name="name"
                                        required
                                        placeholder="Nome do Fluxo (ex: Prospecção B2B)"
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <textarea
                                        name="description"
                                        placeholder="Descrição opcional..."
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
                            >
                                Criar Agora
                                <ArrowRight size={16} />
                            </button>
                        </form>
                    </div>

                    {/* Existing Workflows */}
                    {workflows.map((wf) => (
                        <Link
                            key={wf.id}
                            href={`/dashboard/workflows/${wf.id}`}
                            className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                        <Activity size={20} />
                                    </div>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${wf.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-accent text-muted-foreground'
                                        }`}>
                                        {wf.status === 'active' ? 'Ativo' : 'Rascunho'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold group-hover:text-primary">{wf.name}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{wf.description || "Sem descrição"}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                                    <Calendar size={14} />
                                    {new Date(wf.createdAt).toLocaleDateString('pt-BR')}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    Abrir Editor
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        );
    } catch (error: any) {
        console.error("Workflows Page Error:", error);
        return (
            <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-red-900">
                <h1 className="text-2xl font-bold mb-2">Erro nos Fluxos</h1>
                <p className="mb-4">Houve um erro ao carregar os fluxos. Isso pode ocorrer se as tabelas do banco de dados não estiverem sincronizadas.</p>
                <div className="bg-red-100 p-4 rounded-lg font-mono text-sm overflow-auto">
                    {error?.message || String(error)}
                </div>
                <p className="mt-4 text-sm opacity-70">Verifique se você executou a migração do banco de dados para a nova tabela `workflows`.</p>
            </div>
        );
    }
}
