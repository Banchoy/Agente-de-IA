import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { AgentRepository } from "@/lib/repositories/agent";
import { ArrowLeft, Sparkles, Bot, Save, Trash2, Phone, Zap, User, Target, Award } from "lucide-react";
import Link from "next/link";
import { updateAgent } from "../actions";
import { db } from "@/lib/db";
import { whatsappSessions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { TemperatureSlider } from "@/components/agents/TemperatureSlider";
import { AIService } from "@/lib/services/ai";

export default async function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/org-selection");

    const agent = await AgentRepository.getById(id);

    if (!agent) notFound();

    const config = (agent.config as any) || {};

    // Get all available sessions for this organization
    const sessions = await db.select({ 
        sessionId: whatsappSessions.sessionId 
    })
    .from(whatsappSessions)
    .where(eq(whatsappSessions.organizationId, agent.organizationId))
    .groupBy(whatsappSessions.sessionId);

    const availableSessions = sessions.map(s => s.sessionId);

    // Get dynamic free models from OpenRouter
    const freeModels = await AIService.getOpenRouterFreeModels();

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-20">
            {/* Navigation & Header */}
            <div className="flex flex-col gap-6">
                <Link href="/dashboard/agents" className="inline-flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest group w-fit">
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Voltar para a Central de Agentes
                </Link>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-foreground text-background shadow-2xl ring-4 ring-primary/20 rotate-3 hover:rotate-0 transition-all duration-500">
                            <Bot size={40} />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">{agent.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${agent.status === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                    {agent.status}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID do Sistema: {agent.id}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 rounded-2xl border-2 border-red-500/20 px-6 py-3 text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">
                            <Trash2 size={16} />
                            Desativar Agente
                        </button>
                    </div>
                </div>
            </div>

            <form action={updateAgent.bind(null, agent.id)} className="grid gap-8 lg:grid-cols-12">
                {/* Left Column: Configurations */}
                <div className="lg:col-span-8 space-y-8">
                    {/* General Settings Card */}
                    <div className="rounded-[2.5rem] border border-border bg-card p-10 shadow-xl relative overflow-hidden ring-1 ring-white/5">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Zap size={18} className="text-primary" />
                            </div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Núcleo de Inteligência</h2>
                        </div>

                        <div className="grid gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Pseudônimo do Agente</label>
                                <input
                                    name="name"
                                    defaultValue={agent.name}
                                    placeholder="ex: atendente de vendas"
                                    required
                                    className="w-full rounded-2xl border-2 border-border bg-background px-6 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Missão Principal (Descrição)</label>
                                <textarea
                                    name="description"
                                    defaultValue={agent.description || ""}
                                    placeholder="descreva o propósito deste agente no seu fluxo..."
                                    rows={3}
                                    className="w-full rounded-2xl border-2 border-border bg-background px-6 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner resize-none"
                                />
                            </div>

                            <hr className="border-border/50" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Diretrizes do Sistema (Prompt)</h3>
                                    <span className="text-[10px] text-muted-foreground font-bold lowercase opacity-40 italic">instruções de comportamento</span>
                                </div>
                                <textarea
                                    name="systemPrompt"
                                    defaultValue={config.systemPrompt || ""}
                                    placeholder="Aja como um especialista em..."
                                    rows={10}
                                    required
                                    className="w-full rounded-[2rem] border-2 border-border bg-background/50 px-8 py-6 text-sm font-medium text-foreground focus:border-primary focus:outline-none transition-all resize-none font-mono leading-relaxed"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Personalização e Vendas (Ajuste por Áudio) */}
                    <div className="rounded-[2.5rem] border border-border bg-card p-10 shadow-xl relative overflow-hidden ring-1 ring-white/5 border-primary/20 bg-gradient-to-br from-card to-primary/5">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Target size={18} className="text-primary" />
                            </div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Personalização e Vendas</h2>
                        </div>

                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Nome do(a) Atendente</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input
                                        name="agentRealName"
                                        defaultValue={config.agentRealName || ""}
                                        placeholder="ex: Tayná ou Bruno"
                                        className="w-full rounded-2xl border-2 border-border bg-background pl-11 pr-6 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Gênero</label>
                                <select
                                    name="gender"
                                    defaultValue={config.gender || "female"}
                                    className="w-full rounded-2xl border-2 border-border bg-background px-6 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="female">Feminino (Ex: "A" atendente)</option>
                                    <option value="male">Masculino (Ex: "O" atendente)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <div>
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Nome da Sua Agência</label>
                                    <input 
                                        type="text" 
                                        name="businessName"
                                        defaultValue={config.businessName || ""}
                                        placeholder="Ex: DreamStore"
                                        className="w-full mt-2 rounded-2xl border-2 border-border bg-background px-6 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-2 px-1 lowercase italic">Este nome será usado na apresentação.</p>
                                </div>
                            </div>
                            
                            <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Oportunidades de Melhoria (Dores)</label>
                                    <span className="text-[10px] text-primary font-bold uppercase py-1 px-2 bg-primary/10 rounded-lg">Inteligência Multi-Nicho</span>
                                </div>
                                <textarea
                                    name="marketOportunities"
                                    defaultValue={config.marketOportunities || ""}
                                    placeholder="Liste os problemas que a IA deve apontar nos clientes..."
                                    rows={4}
                                    className="w-full rounded-2xl border-2 border-border bg-background px-6 py-4 text-sm font-medium text-foreground focus:border-primary focus:outline-none transition-all shadow-inner resize-none leading-relaxed"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Award size={14} className="text-primary" />
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Prova Social / Case de Sucesso</label>
                                </div>
                                <textarea
                                    name="successCase"
                                    defaultValue={config.successCase || ""}
                                    placeholder="Descreva um resultado real de cliente..."
                                    rows={3}
                                    className="w-full rounded-2xl border-2 border-border bg-background px-6 py-4 text-sm font-medium text-foreground focus:border-primary focus:outline-none transition-all shadow-inner resize-none leading-relaxed italic"
                                />
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Automation Card */}
                    <div className="rounded-[2.5rem] border border-border bg-muted/20 p-10 space-y-8 ring-1 ring-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-xl">
                                <Phone size={18} className="text-green-500" />
                            </div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Integração WhatsApp</h2>
                        </div>
                        
                        <div className="grid gap-8">
                            <label className="flex items-start gap-4 p-4 rounded-3xl bg-card border border-border shadow-sm group hover:border-primary/50 transition-colors cursor-pointer">
                                <div className="relative inline-flex items-center mt-1">
                                    <input
                                        type="checkbox"
                                        name="whatsappResponse"
                                        defaultChecked={config.whatsappResponse}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-black text-foreground uppercase tracking-tight">Ativar Respostas Automáticas</span>
                                    <p className="text-xs text-muted-foreground font-medium lowercase leading-relaxed">quando ligado, o robô assume o controle de todas as mensagens recebidas via baileys.</p>
                                </div>
                            </label>

                            <div className="space-y-3 p-6 bg-background rounded-3xl border-2 border-border border-dashed">
                                <label htmlFor="whatsappInstanceName" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">ID da Instância (Mapping)</label>
                                <select
                                    name="whatsappInstanceName"
                                    id="whatsappInstanceName"
                                    defaultValue={(agent as any).whatsappInstanceName || ""}
                                    className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione uma sessão...</option>
                                    {availableSessions.map(session => (
                                        <option key={session} value={session}>{session}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-muted-foreground px-1 leading-relaxed lowercase italic">vincule este robô a um número de whatsapp específico.</p>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-border/50">
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            name="testMode"
                                            defaultChecked={config.testMode}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 shadow-inner"></div>
                                    </div>
                                    <span className="text-sm font-black text-foreground uppercase tracking-tight">Modo Sandbox (Teste)</span>
                                </label>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Número Seguro para Testes</label>
                                    <input
                                        name="testNumber"
                                        defaultValue={config.testNumber || ""}
                                        placeholder="5511999999999"
                                        className="w-full rounded-2xl border border-border bg-card px-6 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Info & Save */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="rounded-[2.5rem] border border-border bg-card p-8 shadow-xl space-y-8 sticky top-6 ring-1 ring-white/5">
                        <div className="space-y-6">
                            <h2 className="text-xs font-black text-muted-foreground underline decoration-primary decoration-2 underline-offset-8 uppercase tracking-[0.2em] mb-4">Motor de IA</h2>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Provedor Local</label>
                                <select
                                    name="provider"
                                    defaultValue={config.provider || "google"}
                                    className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm font-bold text-foreground focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="google">Google Gemini</option>
                                    <option value="openrouter">OpenRouter (Grátis Dinâmico)</option>
                                    <option value="groq">Groq (Llama)</option>
                                </select>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Modelo Neuronal</label>
                                <select
                                    name="model"
                                    defaultValue={config.model || "gemini-1.5-flash"}
                                    className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm font-bold text-foreground focus:outline-none appearance-none cursor-pointer"
                                >
                                    <optgroup label="Google / Locais">
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Inteligente)</option>
                                        <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                                    </optgroup>
                                    <optgroup label="OpenRouter (Gratuitos)">
                                        {freeModels.map(m => (
                                            <option key={m} value={m}>{m.split('/').pop() || m}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <TemperatureSlider defaultValue={config.temperature || 0.7} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground py-5 text-xs font-black uppercase tracking-widest text-background hover:bg-foreground/90 transition-all active:scale-[0.98] shadow-2xl overflow-hidden"
                        >
                            <Save size={18} className="transition-transform group-hover:scale-110" />
                            Sincronizar Alterações
                        </button>

                        <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 space-y-3 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 text-primary/20 group-hover:text-primary/40 transition-colors">
                                <Sparkles size={24} />
                            </div>
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Dica Especial</h4>
                            <p className="text-[10px] text-primary/80 leading-relaxed font-bold lowercase italic">
                                defina uma **temperatura baixa** (0.2 - 0.4) para assistentes de suporte que precisam seguir regras rígidas de negócio.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
