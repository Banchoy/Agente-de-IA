"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionWall() {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleCheckout = async (planType: string) => {
        setIsLoading(planType);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planType }),
            });
            
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Erro ao gerar link de pagamento.");
                setIsLoading(null);
            }
        } catch (error) {
            toast.error("Falha na conexão com o checkout.");
            setIsLoading(null);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700">
                <Sparkles size={12} />
                Acesso Bloqueado
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground mb-3">
                Assinatura Inativa
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Para utilizar o CRM e todas as funcionalidades de IA, você precisa ativar uma assinatura. Escolha um dos planos abaixo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full text-left">
                {/* Mensal */}
                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                    <h3 className="text-lg font-black text-foreground mb-1">Mensal</h3>
                    <div className="mb-4 flex items-baseline gap-1">
                        <span className="text-muted-foreground font-bold">R$</span>
                        <span className="text-3xl font-black text-foreground">60</span>
                        <span className="text-muted-foreground font-medium text-xs">/mês</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Cobrado mensalmente</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Acesso total</li>
                    </ul>
                    <button 
                        onClick={() => handleCheckout("mensal")}
                        disabled={!!isLoading}
                        className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-bold text-foreground hover:bg-accent transition-all"
                    >
                        {isLoading === "mensal" ? "Aguarde..." : "Assinar Mensal"}
                    </button>
                </div>

                {/* Semestral */}
                <div className="rounded-2xl border-2 border-emerald-500 bg-card p-6 flex flex-col relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                        Recomendado
                    </div>
                    <h3 className="text-lg font-black text-foreground mb-1">Semestral</h3>
                    <div className="mb-4 flex items-baseline gap-1">
                        <span className="text-muted-foreground font-bold">R$</span>
                        <span className="text-3xl font-black text-foreground">40</span>
                        <span className="text-muted-foreground font-medium text-xs">/mês</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Cobrado R$ 240 a cada 6 meses</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Acesso total</li>
                    </ul>
                    <button 
                        onClick={() => handleCheckout("semestral")}
                        disabled={!!isLoading}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-all"
                    >
                        {isLoading === "semestral" ? "Aguarde..." : "Assinar Semestral"}
                    </button>
                </div>

                {/* Anual */}
                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                    <h3 className="text-lg font-black text-foreground mb-1">Anual</h3>
                    <div className="mb-4 flex items-baseline gap-1">
                        <span className="text-muted-foreground font-bold">R$</span>
                        <span className="text-3xl font-black text-foreground">35</span>
                        <span className="text-muted-foreground font-medium text-xs">/mês</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Cobrado R$ 420 por ano</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Acesso total</li>
                    </ul>
                    <button 
                        onClick={() => handleCheckout("anual")}
                        disabled={!!isLoading}
                        className="w-full rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:opacity-90 transition-all"
                    >
                        {isLoading === "anual" ? "Aguarde..." : "Assinar Anual"}
                    </button>
                </div>
            </div>
        </div>
    );
}
