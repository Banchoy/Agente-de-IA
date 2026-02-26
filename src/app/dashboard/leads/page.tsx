
"use client";

import React, { useState } from "react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, User, Phone, MessageSquare } from "lucide-react";

// Mock data for initial UI build
const INITIAL_STAGES = [
    { id: "new", name: "Novo Lead", color: "bg-blue-500" },
    { id: "contacted", name: "Em Atendimento (IA)", color: "bg-yellow-500" },
    { id: "qualified", name: "Qualificado", color: "bg-green-500" },
    { id: "lost", name: "Perdido", color: "bg-red-500" },
];

const INITIAL_LEADS = [
    { id: "1", name: "João Silva", phone: "+55 11 99999-9999", stageId: "new", source: "Meta Ads" },
    { id: "2", name: "Maria Oliveira", phone: "+55 11 88888-8888", stageId: "contacted", source: "Website" },
];

function SortableItem({ lead }: { lead: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-card border rounded-lg p-3 mb-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-sm">{lead.name}</h4>
                <Badge variant="outline" className="text-[10px] px-1 h-4">
                    {lead.source}
                </Badge>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-2 mb-2">
                <Phone className="w-3 h-3" />
                {lead.phone}
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MessageSquare className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <User className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}

function KanbanColumn({ stage, leads }: { stage: any; leads: any[] }) {
    const { setNodeRef } = useSortable({ id: stage.id });

    return (
        <div className="flex-shrink-0 w-80 bg-muted/30 rounded-xl p-4 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <h3 className="font-bold text-sm uppercase tracking-wider">{stage.name}</h3>
                    <Badge variant="secondary" className="ml-2">
                        {leads.length}
                    </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </div>

            <div ref={setNodeRef} className="flex-1 overflow-y-auto min-h-[150px]">
                <SortableContext
                    items={leads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map((lead) => (
                        <SortableItem key={lead.id} lead={lead} />
                    ))}
                </SortableContext>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground h-9 gap-2 border-dashed border">
                    <Plus className="w-4 h-4" />
                    <span className="text-xs">Novo Lead</span>
                </Button>
            </div>
        </div>
    );
}

export default function LeadsPage() {
    const [leadsList, setLeadsList] = useState(INITIAL_LEADS);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event: any) => {
        const { active, over } = event;
        if (!over) return;

        const activeLead = leadsList.find((l) => l.id === active.id);
        const overId = over.id;

        // Check if dragging over a column (stage) or another lead
        const isOverAStage = INITIAL_STAGES.some((s) => s.id === overId);
        let newStageId = overId;

        if (!isOverAStage) {
            const overLead = leadsList.find((l) => l.id === overId);
            newStageId = overLead ? overLead.stageId : activeLead?.stageId;
        }

        if (activeLead && activeLead.stageId !== newStageId) {
            setLeadsList((prev) =>
                prev.map((l) => (l.id === active.id ? { ...l, stageId: newStageId } : l))
            );
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            return;
        }

        if (active.id !== over.id) {
            const oldIndex = leadsList.findIndex((l) => l.id === active.id);
            const newIndex = leadsList.findIndex((l) => l.id === over.id);

            if (newIndex !== -1) {
                setLeadsList((items) => arrayMove(items, oldIndex, newIndex));
            }
        }

        setActiveId(null);
    };

    const activeLead = activeId ? leadsList.find((l) => l.id === activeId) : null;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 p-6 overflow-hidden">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Leads</h1>
                    <p className="text-muted-foreground">Monitore e gerencie seu funil de vendas com IA.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">Importar CSV</Button>
                    <Button className="bg-primary text-primary-foreground">Nova Campanha</Button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-6 h-full min-w-max">
                        {INITIAL_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                leads={leadsList.filter((l) => l.stageId === stage.id)}
                            />
                        ))}
                    </div>

                    <DragOverlay
                        dropAnimation={{
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: { active: { opacity: "0.5" } },
                            }),
                        }}
                    >
                        {activeLead ? <SortableItem lead={activeLead} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
