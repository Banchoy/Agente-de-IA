"use client";

import { useState } from "react";
import { Bot, ArrowLeft, Sparkles, Phone, Loader2 } from "lucide-react";
import Link from "next/link";
import { createAgent } from "@/app/dashboard/agents/actions";
import { toast } from "sonner";

interface AgentFormProps {
    availableSessions: string[];
    freeModels: string[];
    defaultInstanceName?: string;
}

export function AgentForm({ availableSessions, freeModels, defaultInstanceName }: AgentFormProps) {
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        try {
            await createAgent(formData);
            toast.success("Agente criado com sucesso!");
        } catch (error: any) {
            console.error("Erro ao criar agente:", error);
            toast.error(error.message || "Erro ao criar agente. Tente novamente.");
            setIsPending(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8 rounded-[2rem] border border-border bg-card p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10 transition-all hover:shadow-primary/5">
            <div className={`space-y-8 relative z-10 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                {/* Basic Info */}
                <div className="grid gap-6">
                    <div className="space-y-3">
                        <label htmlFor="name" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Nome do Agente</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            placeholder="ex: atendente de vendas"
                            required
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner placeholder:text-muted-foreground/40 placeholder:font-normal"
                        />
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="description" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Descrição Curta</label>
                        <input
                            type="text"
                            name="description"
                            id="description"
                            placeholder="breve resumo da função do robô"
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner placeholder:text-muted-foreground/40 placeholder:font-normal"
                        />
                    </div>
                </div>

                <div className="p-1.5 bg-muted/30 rounded-3xl border border-border">
                    <div className="space-y-3 p-6 bg-card rounded-[1.5rem] border border-border shadow-sm">
                        <label htmlFor="whatsappInstanceName" className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                            <Phone size={14} className="text-primary" />
                            Instância do WhatsApp
                        </label>
                        <select
                            name="whatsappInstanceName"
                            id="whatsappInstanceName"
                            defaultValue={defaultInstanceName || ""}
                            className="w-full rounded-xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
                        >
                            <option value="">Selecione uma sessão...</option>
                            {availableSessions.map(session => (
                                <option key={session} value={session}>{session}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground px-1 leading-relaxed lowercase italic">
                            defina em qual número ou instância este agente deve operar. deixe o padrão se for o único disponível.
                        </p>
                    </div>
                </div>

                {/* AI Config */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                        <label htmlFor="provider" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Provedor de IA</label>
                        <select
                            name="provider"
                            id="provider"
                            required
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
                        >
                            <option value="google">Google Gemini</option>
                            <option value="openrouter">OpenRouter (Grátis Dinâmico)</option>
                            <option value="groq">Groq (Llama)</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label htmlFor="model" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Modelo Selecionado</label>
                        <select
                            name="model"
                            id="model"
                            required
                            className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all shadow-inner appearance-none cursor-pointer"
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
                </div>

                <div className="space-y-3">
                    <label htmlFor="systemPrompt" className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Prompt do Sistema (Personalidade)</label>
                    <textarea
                        name="systemPrompt"
                        id="systemPrompt"
                        placeholder="ex: você é um atendente simpático de uma barbearia..."
                        rows={6}
                        required
                        className="w-full rounded-3xl border border-border bg-background px-6 py-5 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all resize-none shadow-inner placeholder:text-muted-foreground/30"
                    ></textarea>
                    <p className="text-[10px] text-muted-foreground px-1 leading-relaxed lowercase italic">
                        instrua o agente detalhadamente sobre como ele deve se comportar, tom de voz e o que ele pode ou não dizer.
                    </p>
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="group relative flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-foreground py-5 text-xs font-black uppercase tracking-widest text-background hover:bg-foreground/90 transition-all active:scale-[0.98] shadow-lg overflow-hidden disabled:opacity-70"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    {isPending ? (
                        <Loader2 size={18} className="relative z-10 animate-spin" />
                    ) : (
                        <Sparkles size={18} className="relative z-10 transition-transform group-hover:rotate-12" />
                    )}
                    <span className="relative z-10">
                        {isPending ? "Criando Agente..." : "Gerar Agente de IA"}
                    </span>
                </button>
            </div>
        </form>
    );
}
