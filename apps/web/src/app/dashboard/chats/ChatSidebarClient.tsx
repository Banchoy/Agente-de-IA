"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, CheckSquare, Square, X, AlertCircle, Bot, Zap, Calendar, Clock, Pause, BotOff } from "lucide-react";
import { deleteChats } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDroppable } from "@dnd-kit/core";

interface ChatItem {
    leadId: string;
    content: string;
    role: string;
    createdAt: string;
    lead: { 
        name: string; 
        phone: string; 
        lastReadAt?: string; 
        isTyping?: string;
        aiActive?: string;
        metaData?: any;
    };
}

interface Props {
    conversations: ChatItem[];
    activeLeadId?: string;
    customTags?: any[];
}

function DroppableChatItem({ chat, activeLeadId, selectMode, isSelected, onToggleSelect, customTags }: { 
    chat: ChatItem; 
    activeLeadId?: string; 
    selectMode: boolean; 
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    customTags: any[];
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `drop-${chat.leadId}`,
        data: { leadId: chat.leadId }
    });

    const isUnread = !chat.lead?.lastReadAt || new Date(chat.createdAt) > new Date(chat.lead.lastReadAt);
    const metadata = chat.lead?.metaData || {};
    const hasTimer = !!metadata.nextActionAt;
    const activeCard = metadata.activeCard as string | undefined;

    // Configuração visual de cada card ativo
    const CARD_VISUAL: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
        "IA":        { icon: <Zap size={9} className="fill-current" />, label: "IA Ativa",   cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
        "PARAR_IA":  { icon: <BotOff size={9} />,                        label: "IA Parada",  cls: "bg-red-500/20 text-red-400 border-red-500/30" },
        "PAUSA_2H":  { icon: <Pause size={9} />,                         label: "Pausado 2h", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
        "AMANHA":    { icon: <Clock size={9} />,                         label: "Amanhã",     cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
        "AGENDADO":  { icon: <Calendar size={9} />,                      label: "Agendado",   cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    };
    const cardVisual = activeCard ? CARD_VISUAL[activeCard] : null;
    
    // Filtramos as etiquetas que este lead possui
    const leadTagIds = metadata.tags || [];

    return (
        <div ref={setNodeRef} className={`relative transition-all ${isOver ? 'scale-105 z-20 shadow-2xl ring-2 ring-primary bg-primary/5' : ''}`}>
            {selectMode ? (
                <button
                    onClick={() => onToggleSelect(chat.leadId)}
                    className={`w-full flex items-center gap-4 p-5 hover:bg-card transition-all border-b border-border/50 text-left ${
                        isSelected ? "bg-destructive/10 border-l-4 border-l-destructive" : ""
                    }`}
                >
                    <div className="flex-shrink-0">
                        {isSelected
                            ? <CheckSquare size={16} className="text-destructive" />
                            : <Square size={16} className="text-muted-foreground" />
                        }
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shadow-sm">
                        {chat.lead?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black truncate uppercase text-muted-foreground">{chat.lead?.name}</h4>
                        <p className="text-[10px] truncate font-medium lowercase italic text-muted-foreground">
                            {chat.content}
                        </p>
                    </div>
                </button>
            ) : (
                <Link
                    href={`/dashboard/chats?leadId=${chat.leadId}`}
                    scroll={false}
                    className={`flex items-center gap-4 p-5 hover:bg-card transition-all border-b border-border/50 group relative ${
                        activeLeadId === chat.leadId ? "bg-card border-l-4 border-l-primary" : ""
                    }`}
                >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shadow-sm group-hover:scale-110 transition-transform relative">
                        {chat.lead?.name?.charAt(0) || "?"}
                        {isUnread && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary border-2 border-card rounded-full shadow-lg animate-pulse" />
                        )}
                        {chat.lead?.aiActive === "true" && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-foreground text-background rounded-full flex items-center justify-center border-2 border-card shadow-sm">
                                <Bot size={10} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <h4 className={`text-xs font-black truncate uppercase ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                                    {chat.lead?.name}
                                </h4>
                                {/* Card ativo (tag de status) */}
                                {cardVisual && (
                                    <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${cardVisual.cls} shrink-0`}>
                                        {cardVisual.icon}
                                        {cardVisual.label}
                                    </span>
                                )}
                                {/* Mini-tags ao lado do nome */}
                                <div className="flex gap-0.5">
                                    {leadTagIds.map((tagId: string) => {
                                        const tag = customTags.find(t => t.id === tagId);
                                        if (!tag) return null;
                                        return (
                                            <div 
                                                key={tag.id}
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                                title={tag.name}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase">
                                {new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <p className={`text-[10px] truncate font-medium lowercase italic leading-tight flex-1 ${isUnread ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                {chat.lead?.isTyping === "true" ? (
                                    <span className="flex items-center gap-1 text-primary animate-pulse">
                                        digitando... <Bot size={10} />
                                    </span>
                                ) : (
                                    <>{chat.role === "assistant" ? "🤖 " : ""}{chat.content}</>
                                )}
                            </p>
                            <div className="flex gap-1">
                                {hasTimer && <Clock size={10} className="text-amber-500 animate-pulse" />}
                                {metadata.aiPaused === "true" && <Pause size={10} className="text-purple-500" />}
                            </div>
                        </div>
                    </div>
                </Link>
            )}
        </div>
    );
}

export default function ChatSidebarClient({ conversations, activeLeadId, customTags = [] }: Props) {
    const router = useRouter();
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSelect = (leadId: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) next.delete(leadId);
            else next.add(leadId);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === conversations.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(conversations.map(c => c.leadId)));
        }
    };

    const cancelSelect = () => {
        setSelectMode(false);
        setSelected(new Set());
    };

    const handleDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Deseja apagar o histórico de ${selected.size} conversa(s)? Os leads não serão removidos, apenas as mensagens.`)) return;

        setIsDeleting(true);
        try {
            const result = await deleteChats(Array.from(selected));
            if (result.success) {
                toast.success(`${result.deleted} conversa(s) apagada(s) com sucesso!`);
                cancelSelect();
                router.refresh();
                if (activeLeadId && selected.has(activeLeadId)) {
                    router.push("/dashboard/chats");
                }
            } else {
                toast.error("Erro ao apagar conversas.");
            }
        } catch {
            toast.error("Erro técnico ao apagar conversas.");
        } finally {
            setIsDeleting(false);
        }
    };

    const allSelected = selected.size === conversations.length && conversations.length > 0;

    return (
        <>
            {/* Header actions */}
            <div className="flex items-center justify-between mt-4 mb-2 px-6">
                {selectMode ? (
                    <>
                        <button
                            onClick={selectAll}
                            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase"
                        >
                            {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                        </button>
                        <button
                            onClick={cancelSelect}
                            className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase flex items-center gap-1"
                        >
                            <X size={12} /> Cancelar
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setSelectMode(true)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors uppercase ml-auto"
                    >
                        <Trash2 size={12} /> Limpar
                    </button>
                )}
            </div>

            {/* Delete confirm bar */}
            {selectMode && selected.size > 0 && (
                <div className="mx-6 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-destructive text-[10px] font-bold uppercase">
                        <AlertCircle size={12} />
                        {selected.size} selecionada(s)
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-white text-[10px] font-black uppercase px-3 py-1 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                    >
                        <Trash2 size={10} />
                        {isDeleting ? "Apagando..." : "Apagar"}
                    </button>
                </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {conversations.map((chat) => (
                    <DroppableChatItem 
                        key={chat.leadId} 
                        chat={chat} 
                        activeLeadId={activeLeadId}
                        selectMode={selectMode}
                        isSelected={selected.has(chat.leadId)}
                        onToggleSelect={toggleSelect}
                        customTags={customTags}
                    />
                ))}
            </div>
        </>
    );
}
