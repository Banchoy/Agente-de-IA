"use client";

import React from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { applyCardAction } from "./actions";
import { toast } from "sonner";
import CardBank, { CardType } from "@/components/chat/CardBank";

interface Props {
    children: React.ReactNode;
}

export default function ChatContainerClient({ children }: Props) {
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: { distance: 10 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 250, tolerance: 5 },
    });
    const sensors = useSensors(mouseSensor, touchSensor);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.data.current) {
            const cardType = active.data.current.type as CardType;
            const targetId = over.id as string; // leadId

            if (targetId.startsWith("drop-")) {
                const leadId = targetId.replace("drop-", "");
                console.log(`🎯 Card ${cardType} solto no Lead ${leadId}`);
                
                const promise = applyCardAction(leadId, cardType);
                toast.promise(promise, {
                    loading: `Aplicando card ${cardType}...`,
                    success: "Card aplicado com sucesso!",
                    error: "Erro ao aplicar card."
                });
            }
        }
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full">
                <CardBank />
                <div className="flex-1 flex overflow-hidden">
                    {children}
                </div>
            </div>
        </DndContext>
    );
}
