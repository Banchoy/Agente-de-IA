"use client";

import React from "react";
import { Bot, Clock, Calendar, X, Zap } from "lucide-react";
import { clearLeadStatus } from "@/app/dashboard/chats/actions";
import { toast } from "sonner";

interface Props {
    lead: any;
}

export default function ActiveStatusBadges({ lead }: Props) {
    const metadata = (lead?.metaData as any) || {};
    const activeCard = metadata.activeCard;
    const nextActionAt = metadata.nextActionAt;

    if (!activeCard && !nextActionAt && lead.aiActive !== "true") return null;

    const handleRemove = async () => {
        try {
            const promise = clearLeadStatus(lead.id);
            toast.promise(promise, {
                loading: "Removendo status...",
                success: "Status removido!",
                error: "Erro ao remover."
            });
            await promise;
        } catch (err) {
            console.error(err);
        }
    };

    // Mapeamento de Labels e Estilos
    const getCardConfig = () => {
        switch (activeCard) {
            case "IA":
                return { 
                    label: "IA ATIVA", 
                    icon: <Bot size={14} />, 
                    bg: "bg-blue-500/10", 
                    border: "border-blue-500/20", 
                    text: "text-blue-400" 
                };
            case "PAUSA_2H":
                return { 
                    label: "PAUSA 2H", 
                    icon: <Clock size={14} />, 
                    bg: "bg-amber-500/10", 
                    border: "border-amber-500/20", 
                    text: "text-amber-400" 
                };
            case "AMANHA":
                return { 
                    label: "CHAMAR AMANHÃ", 
                    icon: <Calendar size={14} />, 
                    bg: "bg-purple-500/10", 
                    border: "border-purple-500/20", 
                    text: "text-purple-400" 
                };
            case "AGENDADO":
                return { 
                    label: "AGENDADO", 
                    icon: <Zap size={14} />, 
                    bg: "bg-emerald-500/10", 
                    border: "border-emerald-500/20", 
                    text: "text-emerald-400" 
                };
            case "PARAR_IA":
                return { 
                    label: "IA PAUSADA", 
                    icon: <X size={14} />, 
                    bg: "bg-red-500/10", 
                    border: "border-red-500/20", 
                    text: "text-red-400" 
                };
            default:
                if (lead.aiActive === "true") {
                    return { 
                        label: "IA ATIVA", 
                        icon: <Bot size={14} />, 
                        bg: "bg-blue-500/10", 
                        border: "border-blue-500/20", 
                        text: "text-blue-400" 
                    };
                }
                return null;
        }
    };

    const config = getCardConfig();
    if (!config) return null;

    return (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <div className={`
                pointer-events-auto
                flex items-center gap-2 px-3 py-1.5 
                rounded-full border backdrop-blur-md shadow-lg
                animate-in fade-in slide-in-from-top-4 duration-300
                ${config.bg} ${config.border} ${config.text}
            `}>
                <span className="flex items-center gap-2 text-[11px] font-bold tracking-wider">
                    {config.icon}
                    {config.label}
                    {nextActionAt && (
                        <span className="opacity-60 font-normal">
                            • {new Date(nextActionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </span>
                
                <button 
                    onClick={handleRemove}
                    className="ml-1 p-0.5 hover:bg-white/10 rounded-full transition-colors"
                    title="Remover este status"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
