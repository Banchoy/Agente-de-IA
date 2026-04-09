"use client";

import { useEffect, useState } from "react";
import { Loader2, Pause, Play, CheckCircle2, XCircle } from "lucide-react";
import { getOutreachStatus, stopOutreach } from "./outreach-actions";
import { toast } from "sonner";

export function OutreachBanner() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await getOutreachStatus();
            if (res) setStatus(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Polling cada 10s
        return () => clearInterval(interval);
    }, []);

    const handleStop = async () => {
        setActionLoading(true);
        try {
            await stopOutreach();
            toast.success("Envio interrompido com sucesso.");
            await fetchStatus();
        } catch (error) {
            toast.error("Erro ao interromper envio.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !status) return null;
    if (!status?.active && status?.completed === 0) return null;

    const isRunning = status.active;

    return (
        <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card p-6 shadow-xl transition-all hover:shadow-primary/5">
            {/* Background Decor */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 z-10">
                <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isRunning ? 'bg-primary/10 text-primary animate-pulse' : 'bg-green-500/10 text-green-500'}`}>
                        {isRunning ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                    </div>
                    <div>
                        <h3 className="font-black text-foreground uppercase tracking-tight">
                            {isRunning ? "Prospecção em Andamento" : "Prospecção Concluída"}
                        </h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            {status.completed} de {status.total} leads contatados nas últimas 24h
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 max-w-md w-full flex-col gap-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{status.percentage}% Concluído</span>
                        <span className="text-[10px] font-bold text-muted-foreground lowercase italic">{status.pending} restantes</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden shadow-inner border border-border">
                        <div 
                            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-1000 ease-out"
                            style={{ width: `${status.percentage}%` }}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    {isRunning && (
                        <button
                            onClick={handleStop}
                            disabled={actionLoading}
                            className="flex items-center gap-2 rounded-2xl bg-red-500/10 px-6 py-3 text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                            Pausar Envio
                        </button>
                    )}
                    
                    {!isRunning && status.completed > 0 && (
                        <div className="flex items-center gap-2 rounded-2xl bg-green-500/10 px-6 py-3 text-xs font-black text-green-500 uppercase tracking-widest border border-green-500/20">
                            <CheckCircle2 size={16} />
                            Fila Vazia
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
