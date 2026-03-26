"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, CheckSquare, Square, X, AlertCircle, Bot } from "lucide-react";
import { deleteChats } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ChatItem {
    leadId: string;
    content: string;
    role: string;
    createdAt: string;
    lead: { name: string; phone: string; lastReadAt?: string; isTyping?: string };
}

interface Props {
    conversations: ChatItem[];
    activeLeadId?: string;
}

export default function ChatSidebarClient({ conversations, activeLeadId }: Props) {
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
                // Se o lead ativo foi deletado, voltar para a lista
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
            <div className="flex items-center justify-between mt-4 mb-1 px-1">
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
                        <Trash2 size={12} /> Apagar
                    </button>
                )}
            </div>

            {/* Delete confirm bar */}
            {selectMode && selected.size > 0 && (
                <div className="mx-2 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-between gap-2">
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
            {conversations.map((chat) => {
                const isUnread = !chat.lead?.lastReadAt || new Date(chat.createdAt) > new Date(chat.lead.lastReadAt);
                const isSelected = selected.has(chat.leadId);

                return (
                    <div key={chat.leadId} className="relative">
                        {selectMode ? (
                            <button
                                onClick={() => toggleSelect(chat.leadId)}
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
                                    {chat.lead?.name.charAt(0)}
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
                                    {chat.lead?.name.charAt(0)}
                                    {isUnread && (
                                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary border-2 border-card rounded-full shadow-lg animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className={`text-xs font-black truncate uppercase ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                                            {chat.lead?.name}
                                        </h4>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">
                                            {new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] truncate font-medium lowercase italic leading-tight ${isUnread ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                        {chat.lead?.isTyping === "true" ? (
                                            <span className="flex items-center gap-1 text-primary animate-pulse">
                                                digitando... <Bot size={10} />
                                            </span>
                                        ) : (
                                            <>{chat.role === "assistant" ? "🤖 " : ""}{chat.content}</>
                                        )}
                                    </p>
                                </div>
                            </Link>
                        )}
                    </div>
                );
            })}
        </>
    );
}
