"use client";
import { useState } from "react";
import { PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function StopOutreachButton() {
    const [loading, setLoading] = useState(false);

    const handleStop = async () => {
        if (!confirm("Deseja realmente interromper TODOS os disparos agendados?")) return;
        
        setLoading(true);
        try {
            const response = await fetch('/api/outreach/stop', { method: 'POST' });
            if (response.ok) {
                toast.success("Todos os disparos foram interrompidos.");
                window.location.reload();
            } else {
                toast.error("Erro ao interromper disparos.");
            }
        } catch (error) {
            toast.error("Erro na conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            onClick={handleStop}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-red-600/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-600/20 disabled:opacity-50"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <PowerOff size={16} />}
            Parar Todos os Disparos
        </button>
    );
}
