"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, CheckSquare, Square, X, AlertCircle, Bot, Zap, Calendar, Clock, Pause, BotOff } from "lucide-react";
import { deleteChats } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDroppable } from "@dnd-kit/core";
import { useChat } from "./ChatContainerClient";

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
    conversations?: ChatItem[];
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

    // Configuração visual de cada card ativo com cores premium
    const CARD_VISUAL: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
        "IA":        { icon: <Zap size={9} className="fill-current" />, label: "IA Ativa",   cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" },
        "PARAR_IA":  { icon: <BotOff size={9} />,                        label: "IA Parada",  cls: "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]" },
        "PAUSA_2H":  { icon: <Pause size={9} />,                         label: "Pausado 2h", cls: "bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]" },
        "AMANHA":    { icon: <Clock size={9} />,                         label: "Amanhã",     cls: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]" },
        "AGENDADO":  { icon: <Calendar size={9} />,                      label: "Agendado",   cls: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]" },
    };
    const cardVisual = activeCard ? CARD_VISUAL[activeCard] : null;
    
    // Filtramos as etiquetas que este lead possui
    const leadTagIds = metadata.tags || [];

    return (
        <div ref={setNodeRef} className={`relative transition-all duration-300 ${isOver ? 'scale-[1.02] z-20' : ''}`}>
            {/* Drop Overlay Premium */}
            {isOver && (
                <div className="absolute inset-x-2 inset-y-2 bg-primary/10 border-2 border-dashed border-primary/50 rounded-2xl z-30 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in zoom-in duration-200">
                    <div className="bg-primary text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                        <Zap size={14} className="animate-pulse" />
                        Solte para Aplicar
                    </div>
                </div>
            )}

            {selectMode ? (
                <button
                    onClick={() => onToggleSelect(chat.leadId)}
                    className={`w-full flex items-center gap-4 p-5 hover:bg-card/50 transition-all border-b border-border/50 text-left ${
                        isSelected ? "bg-destructive/5 border-l-4 border-l-destructive shadow-inner" : ""
                    }`}
                >
                    <div className="flex-shrink-0">
                        {isSelected
                            ? <CheckSquare size={16} className="text-destructive animate-in zoom-in duration-200" />
                            : <Square size={16} className="text-muted-foreground opacity-30" />
                        }
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shadow-sm">
                        {chat.lead?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black truncate uppercase text-muted-foreground">{chat.lead?.name}</h4>
                        <p className="text-[10px] truncate font-medium lowercase italic text-muted-foreground/60">
                            {chat.content}
                        </p>
                    </div>
                </button>
            ) : (
                <Link
                    href={`/dashboard/chats?leadId=${chat.leadId}`}
                    scroll={false}
                    className={`flex items-center gap-4 p-5 hover:bg-card/40 transition-all border-b border-border/50 group relative ${
                        activeLeadId === chat.leadId ? "bg-card/60 border-l-4 border-l-primary shadow-sm" : ""
                    }`}
                >
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shadow-sm group-hover:scale-110 transition-transform relative">
                        {chat.lead?.name?.charAt(0) || "?"}
                        {isUnread && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary border-2 border-card rounded-full shadow-lg animate-pulse" />
                        )}
                        {chat.lead?.aiActive === "true" && (
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-foreground text-background rounded-full flex items-center justify-center border-2 border-card shadow-lg animate-bounce-subtle">
                                <Bot size={12} className={chat.lead?.isTyping === "true" ? "animate-pulse" : ""} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 ml-1">
                        <div className="flex justify-between items-baseline mb-1.5">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <h4 className={`text-sm font-bold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                                    {chat.lead?.name}
                                </h4>
                                
                                {/* Card ativo (tag de status) */}
                                {cardVisual && (
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border animate-in slide-in-from-left-2 duration-300 ${cardVisual.cls} shrink-0`}>
                                        {cardVisual.icon}
                                        {cardVisual.label}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] font-bold text-muted-foreground/50 uppercase whitespace-nowrap ml-2">
                                {new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>

                        {/* Etiquetas customizadas - Estilo Badge Premium */}
                        <div className="flex gap-1 flex-wrap mb-1">
                            {leadTagIds.map((tagId: string) => {
                                const tag = customTags.find(t => t.id === tagId);
                                if (!tag) return null;
                                return (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight border shadow-sm transition-transform hover:scale-105 shrink-0 animate-in zoom-in duration-300"
                                        style={{
                                            backgroundColor: `${tag.color}15`,
                                            color: tag.color,
                                            borderColor: `${tag.color}30`
                                        }}
                                        title={tag.name}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full shadow-inner animate-pulse" style={{ backgroundColor: tag.color }} />
                                        {tag.name.substring(0, 12)}
                                    </span>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <p className={`text-[11px] truncate font-medium leading-tight flex-1 ${isUnread ? "text-primary font-bold" : "text-muted-foreground/70"}`}>
                                {chat.lead?.isTyping === "true" ? (
                                    <span className="flex items-center gap-1 text-primary animate-pulse font-bold lowercase">
                                        digitando... <Bot size={11} className="animate-spin-slow" />
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        {chat.role === "assistant" && <Bot size={11} className="opacity-40" />}
                                        <span className="truncate italic opacity-80">{chat.content}</span>
                                    </span>
                                )}
                            </p>
                            <div className="flex gap-1.5 items-center">
                                {hasTimer && (
                                    <div className="bg-amber-500/10 p-1 rounded-md animate-pulse">
                                        <Clock size={11} className="text-amber-500" />
                                    </div>
                                )}
                                {metadata.aiPaused === "true" && (
                                    <div className="bg-purple-500/10 p-1 rounded-md">
                                        <Pause size={11} className="text-purple-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>
            )}
        </div>
    );
}

export default function ChatSidebarClient({ conversations: propConversations, activeLeadId, customTags = [] }: Props) {
    const { conversations: contextConversations } = useChat();
    const conversations = contextConversations || propConversations || [];
    
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
