import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { AgentRepository } from "@/lib/repositories/agent";
import { ArrowLeft, Sparkles, Bot, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { updateAgent } from "../actions";

export default async function AgentDetailsPage({ params }: { params: { id: string } }) {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/org-selection");

    const agent = await AgentRepository.getById(id);

    if (!agent) notFound();

    const config = (agent.config as any) || {};

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div className="flex items-center justify-between">
                <Link href="/dashboard/agents" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                    <ArrowLeft size={16} />
                    Voltar para Agentes
                </Link>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all">
                        <Trash2 size={18} />
                        Excluir
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                    <Bot size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{agent.name}</h1>
                    <p className="text-zinc-600">ID: {agent.id}</p>
                </div>
            </div>

            <form action={updateAgent.bind(null, agent.id)} className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-zinc-900">Configurações Gerais</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">Nome do Agente</label>
                                <input
                                    name="name"
                                    defaultValue={agent.name}
                                    placeholder="Ex: Atendente de Vendas"
                                    required
                                    className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">Descrição</label>
                                <textarea
                                    name="description"
                                    defaultValue={agent.description || ""}
                                    placeholder="O que este agente faz?"
                                    rows={2}
                                    className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <hr className="border-zinc-100" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-500">Personalidade e Inteligência</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-900">Prompt do Sistema</label>
                                <textarea
                                    name="systemPrompt"
                                    defaultValue={config.systemPrompt || ""}
                                    placeholder="Instruções para o agente..."
                                    rows={8}
                                    required
                                    className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none transition-all resize-none font-mono"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6 border-dashed border-2">
                        <h2 className="text-lg font-bold text-zinc-900">Modo de Teste</h2>
                        <p className="text-sm text-zinc-500">Habilite para que o agente responda apenas a um número específico no WhatsApp.</p>

                        <div className="flex items-center gap-4">
                            <input
                                type="checkbox"
                                name="testMode"
                                defaultChecked={config.testMode}
                                className="h-5 w-5 rounded border-zinc-200 text-zinc-900 focus:ring-zinc-900"
                            />
                            <label className="text-sm font-medium text-zinc-700">Ativar Modo de Teste</label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900">Número de Teste (DDI + DDD + Número)</label>
                            <input
                                name="testNumber"
                                defaultValue={config.testNumber || ""}
                                placeholder="Ex: 5511999999999"
                                className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
                        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-500">Modelo de IA</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-500">Provedor</label>
                                <select
                                    name="provider"
                                    defaultValue={config.provider || "google"}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none bg-zinc-50 transition-all font-medium"
                                >
                                    <option value="google">Google Gemini</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-500">Modelo</label>
                                <select
                                    name="model"
                                    defaultValue={config.model || "gemini-1.5-flash"}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none bg-zinc-50 transition-all font-medium"
                                >
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-500">Temperatura: {config.temperature || 0.7}</label>
                                <input
                                    type="range"
                                    name="temperature"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    defaultValue={config.temperature || 0.7}
                                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-400 font-bold px-1">
                                    <span>PRECISO</span>
                                    <span>CRIATIVO</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-sm"
                        >
                            <Save size={18} />
                            Salvar Alterações
                        </button>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-blue-50/50 p-6 space-y-3">
                        <div className="flex items-center gap-2 text-blue-700">
                            <Sparkles size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Dica Premium</span>
                        </div>
                        <p className="text-xs text-blue-600 leading-relaxed">
                            Use um **System Prompt** detalhado para que o agente entenda exatamente o contexto do seu negócio. Defina o tom de voz e os limites da assistência.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
