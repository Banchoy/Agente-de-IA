"use client";

import React from "react";
import { Bot, Clock, Calendar, X, Zap } from "lucide-react";
import { clearLeadStatus, toggleLeadAI } from "@/app/dashboard/chats/actions";
import { toast } from "sonner";

interface Props {
    lead: any;
}

export default function ActiveStatusBadges({ lead }: Props) {
    const metadata = (lead?.metaData as any) || {};
    const activeCard = metadata.activeCard;
    const nextActionAt = metadata.nextActionAt;

    const badges = [];

    // 1. Badge de IA Ativa (Principal)
    if (lead.aiActive === "true" && activeCard !== "PARAR_IA") {
        badges.push({
            id: "ia-ativa",
            label: "IA ATIVA",
            icon: <Bot size={13} />,
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            text: "text-blue-400",
            onRemove: async () => {
                const promise = toggleLeadAI(lead.id, false);
                toast.promise(promise, {
                    loading: "Desativando IA...",
                    success: "IA Desativada",
                    error: "Erro ao desativar."
                });
                await promise;
            }
        });
    }

    // 2. Badges de Ação Temporal ou CRM
    if (activeCard && activeCard !== "IA") {
        const handleClear = async () => {
            const promise = clearLeadStatus(lead.id);
            toast.promise(promise, {
                loading: "Limpando status...",
                success: "Status limpo",
                error: "Erro ao limpar."
            });
            await promise;
        };

        switch (activeCard) {
            case "PAUSA_2H":
                badges.push({
                    id: "pausa-2h",
                    label: "PAUSA 2H",
                    sub: nextActionAt ? new Date(nextActionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                    icon: <Clock size={13} />,
                    bg: "bg-amber-500/10",
                    border: "border-amber-500/20",
                    text: "text-amber-400",
                    onRemove: handleClear
                });
                break;
            case "AMANHA":
                badges.push({
                    id: "amanha",
                    label: "CHAMAR AMANHÃ",
                    icon: <Calendar size={13} />,
                    bg: "bg-purple-500/10",
                    border: "border-purple-500/20",
                    text: "text-purple-400",
                    onRemove: handleClear
                });
                break;
            case "AGENDADO":
                badges.push({
                    id: "agendado",
                    label: "AGENDADO",
                    icon: <Zap size={13} />,
                    bg: "bg-emerald-500/10",
                    border: "border-emerald-500/20",
                    text: "text-emerald-400",
                    onRemove: handleClear
                });
                break;
            case "PARAR_IA":
                badges.push({
                    id: "ia-pausada",
                    label: "IA PAUSADA",
                    icon: <X size={13} />,
                    bg: "bg-red-500/10",
                    border: "border-red-500/20",
                    text: "text-red-400",
                    onRemove: handleClear
                });
                break;
        }
    }

    if (badges.length === 0) return null;

    return (
        <div className="absolute top-16 left-0 right-0 flex flex-wrap justify-center gap-2 z-30 pointer-events-none px-4">
            {badges.map((badge) => (
                <div 
                    key={badge.id}
                    className={`
                        pointer-events-auto
                        flex items-center gap-2 px-3 py-1.5 
                        rounded-full border backdrop-blur-md shadow-lg
                        animate-in opacity-0 fade-in slide-in-from-top-2 duration-300 fill-mode-forwards
                        ${badge.bg} ${badge.border} ${badge.text}
                    `}
                >
                    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider">
                        {badge.icon}
                        {badge.label}
                        {badge.sub && (
                            <span className="opacity-60 font-normal ml-1">
                                • {badge.sub}
                            </span>
                        )}
                    </span>
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            badge.onRemove();
                        }}
                        className="ml-1 p-0.5 hover:bg-white/10 rounded-full transition-colors"
                        title="Remover"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}
