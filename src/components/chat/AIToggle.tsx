"use client";

import { useState } from "react";
import { Bot, User, RefreshCw } from "lucide-react";
import { toggleLeadAI } from "@/app/dashboard/chats/actions";
import { toast } from "sonner";

interface AIToggleProps {
    leadId: string;
    initialStatus: string;
}

export function AIToggle({ leadId, initialStatus }: AIToggleProps) {
    const [isActive, setIsActive] = useState(initialStatus === "true");
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
        setIsLoading(true);
        const newStatus = !isActive;
        const res = await toggleLeadAI(leadId, newStatus);
        
        if (res.success) {
            setIsActive(newStatus);
            toast.success(newStatus ? "IA Ativada para este lead" : "IA Desativada. Você assumiu o controle.");
        } else {
            toast.error("Erro ao alterar status da IA");
        }
        setIsLoading(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                ${isActive 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "bg-muted text-muted-foreground border border-border"}
                ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"}
            `}
        >
            {isLoading ? (
                <RefreshCw size={12} className="animate-spin" />
            ) : isActive ? (
                <>
                    <Bot size={12} className="animate-bounce" />
                    IA Ativa
                </>
            ) : (
                <>
                    <User size={12} />
                    Humano
                </>
            )}
        </button>
    );
}
