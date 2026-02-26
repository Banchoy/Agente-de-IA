
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
import { Plus, MoreHorizontal, User, Phone, MessageSquare, Calendar, CheckCircle, XCircle, Search } from "lucide-react";

// Stages requested by user
const INITIAL_STAGES = [
    { id: "new", name: "Novo Lead", color: "bg-blue-500" },
    { id: "ai_service", name: "Em Atendimento (IA)", color: "bg-amber-500" },
    { id: "qualified", name: "Qualificado", color: "bg-emerald-500" },
    { id: "scheduled", name: "Agendado", color: "bg-purple-500" },
    { id: "closed", name: "Fechado", color: "bg-green-600" },
    { id: "lost", name: "Perdido", color: "bg-rose-500" },
];

const INITIAL_LEADS = [
    { id: "1", name: "João Silva", phone: "+55 11 99999-9999", stageId: "new", source: "Meta Ads", value: "R$ 5.000" },
    { id: "2", name: "Maria Oliveira", phone: "+55 11 88888-8888", stageId: "ai_service", source: "Facebook Leads", value: "R$ 2.500" },
    { id: "3", name: "Roberto Santos", phone: "+55 21 77777-7777", stageId: "qualified", source: "Instagram Ads", value: "R$ 12.000" },
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
            className="bg-white border border-zinc-200 rounded-xl p-4 mb-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-zinc-900 group transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-zinc-900 leading-tight">{lead.name}</h4>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider h-5">
                    {lead.source}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-xs text-zinc-500 gap-2">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                </div>
                <div className="text-sm font-black text-zinc-900">
                    {lead.value}
                </div>
            </div>

            <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center">
                        <User size={12} className="text-zinc-500" />
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function KanbanColumn({ stage, leads }: { stage: any; leads: any[] }) {
    const { setNodeRef } = useSortable({ id: stage.id });

    return (
        <div className="flex-shrink-0 w-80 bg-zinc-100/50 rounded-2xl p-4 flex flex-col max-h-full border border-zinc-200/50">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-sm`} />
                    <h3 className="font-black text-xs uppercase tracking-widest text-zinc-500">{stage.name}</h3>
                    <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">
                        {leads.length}
                    </span>
                </div>
                <Plus className="w-4 h-4 text-zinc-400 cursor-pointer hover:text-zinc-900 transition-colors" />
            </div>

            <div ref={setNodeRef} className="flex-1 overflow-y-auto min-h-[150px] custom-scrollbar pr-1">
                <SortableContext
                    items={leads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map((lead) => (
                        <SortableItem key={lead.id} lead={lead} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

export default function CRMKanban() {
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
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            placeholder="Buscar lead..."
                            className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none w-64 transition-all"
                        />
                    </div>
                    <Button variant="outline" className="rounded-xl border-zinc-200">
                        Filtros
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">Exportar</Button>
                    <Button className="bg-zinc-900 text-white rounded-xl hover:bg-zinc-800">
                        Adicionar Lead
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-6 -mx-6 px-6 custom-scrollbar">
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
