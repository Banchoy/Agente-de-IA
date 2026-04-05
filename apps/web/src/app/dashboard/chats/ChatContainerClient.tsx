"use client";

import React, { createContext, useContext, useOptimistic, useTransition, useCallback } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { applyCardAction, assignTagToLead, assignTagToMessage } from "./actions";
import { toast } from "sonner";
import CardBank from "@/components/chat/CardBank";
import { useRouter } from "next/navigation";

// --- Contexto para Estado Otimista ---
interface ChatContextType {
    conversations: any[];
    isPending: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) throw new Error("useChat deve ser usado dentro de um ChatContainerClient");
    return context;
}

interface Props {
    initialConversations: any[];
    children: React.ReactNode;
    customTags?: any[];
}

export default function ChatContainerClient({ initialConversations, children, customTags = [] }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Estado Otimista para as conversas
    const [optimisticConversations, addOptimisticAction] = useOptimistic(
        initialConversations,
        (state, action: { type: 'ADD_TAG' | 'SET_STATUS'; leadId: string; payload: any }) => {
            return state.map(chat => {
                if (chat.leadId !== action.leadId) return chat;

                const newLead = { ...chat.lead };
                const newMetadata = { ...(newLead.metaData || {}) };

                if (action.type === 'ADD_TAG') {
                    const currentTags = newMetadata.tags || [];
                    if (!currentTags.includes(action.payload.tagId)) {
                        newMetadata.tags = [...currentTags, action.payload.tagId];
                    }
                } else if (action.type === 'SET_STATUS') {
                    Object.assign(newLead, action.payload.leadUpdates);
                    Object.assign(newMetadata, action.payload.metadataUpdates);
                }

                return { ...chat, lead: { ...newLead, metaData: newMetadata } };
            });
        }
    );

    const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
    const sensors = useSensors(mouseSensor, touchSensor);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const cardData = active.data.current;
        if (!cardData) return;

        const dropTargetId = over.id as string;
        
        // 1. Drop em Lead (Sidebar)
        if (dropTargetId.startsWith("drop-")) {
            const leadId = dropTargetId.replace("drop-", "");
            
            if (cardData.isCustom) {
                // UI Otimista: Adiciona a tag imediatamente
                startTransition(() => {
                    addOptimisticAction({ type: 'ADD_TAG', leadId, payload: { tagId: cardData.type } });
                });

                const promise = assignTagToLead(leadId, cardData.type);
                toast.promise(promise, {
                    loading: "Aplicando etiqueta...",
                    success: "Etiqueta aplicada!",
                    error: "Erro ao aplicar."
                });
                
                await promise;
                startTransition(() => router.refresh());
            } else {
                // UI Otimista: Aplica o status visual imediatamente
                const statusMap: Record<string, any> = {
                    "IA":       { leadUpdates: { aiActive: "true" },  metadataUpdates: { aiPaused: "false", activeCard: "IA" } },
                    "PARAR_IA": { leadUpdates: { aiActive: "false" }, metadataUpdates: { aiPaused: "true",  activeCard: "PARAR_IA" } },
                    "PAUSA_2H": { leadUpdates: {},                   metadataUpdates: { aiPaused: "true",  activeCard: "PAUSA_2H", nextActionAt: new Date(Date.now() + 7200000).toISOString() } },
                    "AMANHA":   { leadUpdates: {},                   metadataUpdates: { activeCard: "AMANHA" } },
                    "AGENDADO": { leadUpdates: {},                   metadataUpdates: { activeCard: "AGENDADO" } },
                };

                const updates = statusMap[cardData.type];
                if (updates) {
                    startTransition(() => {
                        addOptimisticAction({ type: 'SET_STATUS', leadId, payload: updates });
                    });
                }

                const promise = applyCardAction(leadId, cardData.type as any);
                toast.promise(promise, {
                    loading: "Aplicando ação...",
                    success: "Ação aplicada!",
                    error: "Erro ao aplicar."
                });

                await promise;
                startTransition(() => router.refresh());
            }
        }
        
        // 2. Drop em Mensagem (Bubble)
        if (dropTargetId.startsWith("msg-")) {
            const messageId = dropTargetId.replace("msg-", "");
            if (cardData.isCustom) {
                const promise = assignTagToMessage(messageId, cardData.type);
                toast.promise(promise, {
                    loading: "Tagueando mensagem...",
                    success: "Mensagem tagueada!",
                    error: "Erro ao taguear."
                });
            } else {
                toast.error(`Ação disponível apenas para o lead.`);
            }
        }
    }, [addOptimisticAction, router]);

    return (
        <ChatContext.Provider value={{ conversations: optimisticConversations, isPending }}>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="flex flex-col h-full overflow-hidden">
                    <CardBank customTags={customTags} />
                    <div className="flex-1 flex overflow-hidden">
                        {children}
                    </div>
                </div>
            </DndContext>
        </ChatContext.Provider>
    );
}
