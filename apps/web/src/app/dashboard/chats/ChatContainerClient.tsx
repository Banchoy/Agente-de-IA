"use client";

import React, { useCallback, useOptimistic, useTransition } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { applyCardAction, assignTagToLead, assignTagToMessage } from "./actions";
import { toast } from "sonner";
import CardBank, { CardType } from "@/components/chat/CardBank";
import { useRouter } from "next/navigation";

interface Props {
    children: React.ReactNode;
    customTags?: any[];
}

export default function ChatContainerClient({ children, customTags = [] }: Props) {
    const router = useRouter();
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: { distance: 8 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 5 },
    });
    const sensors = useSensors(mouseSensor, touchSensor);
    const [isPending, startTransition] = useTransition();

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const cardData = active.data.current;
        if (!cardData) return;

        const dropTargetId = over.id as string;
        
        // 1. Drop em Lead (Sidebar)
        if (dropTargetId.startsWith("drop-")) {
            const leadId = dropTargetId.replace("drop-", "");
            
            if (cardData.isCustom) {
                console.log(`🏷️ Tagueando lead ${leadId} com tag custom ${cardData.type}`);
                const promise = assignTagToLead(leadId, cardData.type);
                toast.promise(promise, {
                    loading: "Aplicando etiqueta...",
                    success: "Etiqueta aplicada ao lead!",
                    error: "Erro ao aplicar etiqueta."
                });
                promise.then(() => startTransition(() => router.refresh()));
            } else {
                const promise = applyCardAction(leadId, cardData.type as any);
                const labels: Record<string, string> = {
                    "IA": "Ligar/Desligar IA",
                    "PARAR_IA": "Parar IA",
                    "AGENDADO": "Marcar como Agendado",
                    "AMANHA": "Adiar para Amanhã",
                    "PAUSA_2H": "Pausar por 2h"
                };
                toast.promise(promise, {
                    loading: `Aplicando: ${labels[cardData.type] || cardData.label}...`,
                    success: `${labels[cardData.type] || cardData.label} aplicado!`,
                    error: "Erro ao aplicar ação."
                });
                promise.then(() => startTransition(() => router.refresh()));
            }
        }
        
        // 2. Drop em Mensagem (Bubble)
        if (dropTargetId.startsWith("msg-")) {
            const messageId = dropTargetId.replace("msg-", "");
            
            if (cardData.isCustom) {
                console.log(`🏷️ Tagueando mensagem ${messageId} com tag ${cardData.type}`);
                const promise = assignTagToMessage(messageId, cardData.type);
                toast.promise(promise, {
                    loading: "Tagueando mensagem...",
                    success: "Mensagem tagueada com sucesso!",
                    error: "Erro ao taguear mensagem."
                });
            } else {
                toast.error(`Ação "${cardData.label}" disponível apenas para o lead inteiro.`);
            }
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full">
                <CardBank customTags={customTags} />
                <div className="flex-1 flex overflow-hidden">
                    {children}
                </div>
            </div>
        </DndContext>
    );
}
