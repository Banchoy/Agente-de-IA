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
import { Plus, MoreHorizontal, User, Phone, MessageSquare, Calendar, CheckCircle, XCircle, Search, RefreshCw, Bot } from "lucide-react";
import LeadDetailsModal from "./LeadDetailsModal";
import AddLeadModal from "./AddLeadModal";
import { updateLeadMetadata, updateLeadStage, importLeads, startOutreach, createLead } from "./leads/actions";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Stages requested by user
const INITIAL_STAGES = [
    { id: "prospecting", name: "Prospecção", color: "bg-slate-400" },
    { id: "qualification", name: "Qualificação", color: "bg-amber-400" },
    { id: "negotiation", name: "Negociação", color: "bg-blue-400" },
    { id: "sold", name: "Vendido", color: "bg-emerald-500" },
];

function SortableItem({ lead, onClick }: { lead: any; onClick: () => void }) {
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
            onClick={onClick}
            className="bg-card border border-border rounded-xl p-4 mb-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary group transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-foreground leading-tight">{lead.name}</h4>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider h-5 bg-accent text-accent-foreground">
                    {lead.source}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center text-xs text-muted-foreground gap-2 hover:text-emerald-600 transition-colors w-fit"
                >
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                </a>
                <div className="text-sm font-black text-foreground">
                    {lead.value}
                </div>
            </div>

            <div className="flex justify-between items-center border-t border-border pt-3">
                <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[10px] font-bold text-accent-foreground">
                        {Object.keys(lead.metaData || {}).length}
                    </div>
                </div>
                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-accent"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Future: open chat directly
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function KanbanColumn({ stage, leads, onLeadClick }: { stage: any; leads: any[]; onLeadClick: (lead: any) => void }) {
    const { setNodeRef } = useSortable({ id: stage.id });

    return (
        <div className="flex-shrink-0 w-80 bg-muted/30 rounded-2xl p-4 flex flex-col max-h-full border border-border/50">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-sm`} />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">{stage.name}</h3>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {leads.length}
                    </span>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </div>

            <div ref={setNodeRef} className="flex-1 overflow-y-auto min-h-[150px] custom-scrollbar pr-1">
                <SortableContext
                    items={leads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map((lead) => (
                        <SortableItem key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

export default function CRMKanban({ initialLeads = [] }: { initialLeads?: any[] }) {
    const [leadsList, setLeadsList] = useState(initialLeads);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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

        const activeLead = leadsList.find((l: any) => l.id === active.id);
        const overId = over.id;

        const isOverAStage = INITIAL_STAGES.some((s) => s.id === overId);
        let newStageId = overId;

        if (!isOverAStage) {
            const overLead = leadsList.find((l: any) => l.id === overId);
            newStageId = overLead ? overLead.stageId : activeLead?.stageId;
        }

        if (activeLead && activeLead.stageId !== newStageId) {
            setLeadsList((prev: any) =>
                prev.map((l: any) => (l.id === active.id ? { ...l, stageId: newStageId } : l))
            );
        }
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            return;
        }

        if (active.id !== over.id) {
            const oldIndex = leadsList.findIndex((l: any) => l.id === active.id);
            const newIndex = leadsList.findIndex((l: any) => l.id === over.id);

            if (newIndex !== -1) {
                setLeadsList((items: any) => arrayMove(items, oldIndex, newIndex));
            }
        } else {
            const lead = leadsList.find((l: any) => l.id === active.id);
            if (lead) {
                await updateLeadStage(active.id as string, lead.stageId);
            }
        }

        setActiveId(null);
    };

    const handleLeadClick = (lead: any) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const handleSaveLead = async (leadId: string, updatedData: any) => {
        setLeadsList((prev: any) => prev.map((l: any) => l.id === leadId ? updatedData : l));
        await updateLeadMetadata(leadId, updatedData.metaData);
    };

    const handleAddLead = async (newLeadData: any) => {
        const res = await createLead(newLeadData);
        if (res.success) {
            setLeadsList((prev: any) => [res.lead, ...prev]);
            toast.success("Lead adicionado com sucesso!");
        } else {
            toast.error("Erro ao salvar lead no banco de dados.");
        }
    };

    const handleStartOutreach = async () => {
        try {
            setIsExporting(true);
            const result = await startOutreach();
            if (result.success) {
                toast.success(`Prospecção iniciada para ${result.count} leads!`);
            } else {
                toast.error(result.error || "Erro ao iniciar prospecção.");
            }
        } catch (error) {
            toast.error("Erro técnico ao iniciar prospecção.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.split(".").pop()?.toLowerCase();

        if (extension === "csv") {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const importedLeads = results.data.map((row: any) => ({
                        name: row.nome || row.name || "Lead Importado",
                        phone: row.telefone || row.phone || "",
                        email: row.email || "",
                        stageId: "prospecting",
                        source: "Importação CSV",
                        metaData: { ...row }
                    }));
                    
                    const res = await importLeads(importedLeads);
                    if (res.success) {
                        toast.success(`${importedLeads.length} leads importados com sucesso!`);
                        // Recarregar leads aconteceria via revalidatePath no servidor, 
                        // mas para feedback imediato podemos atualizar localmente também ou forçar refresh
                        window.location.reload();
                    } else {
                        toast.error("Erro ao salvar leads importados.");
                    }
                }
            });
        } else if (extension === "xlsx" || extension === "xls") {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const importedLeads = data.map((row: any) => ({
                    name: (row as any).nome || (row as any).name || "Lead Importado",
                    phone: (row as any).telefone || (row as any).phone || "",
                    email: (row as any).email || "",
                    stageId: "prospecting",
                    source: "Importação Excel",
                    metaData: { ...row }
                }));

                const res = await importLeads(importedLeads);
                if (res.success) {
                    toast.success(`${importedLeads.length} leads importados com sucesso!`);
                    window.location.reload();
                } else {
                    toast.error("Erro ao salvar leads importados.");
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const activeLead = activeId ? leadsList.find((l: any) => l.id === activeId) : null;

    return (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            placeholder="Buscar lead..."
                            className="pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none w-64 transition-all"
                        />
                    </div>
                    <Button variant="outline" className="rounded-xl border-border">
                        Filtros
                    </Button>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleImport}
                        />
                        <Button variant="outline" className="rounded-xl border-border">Importar</Button>
                    </div>
                    <Button
                        onClick={handleStartOutreach}
                        disabled={isExporting}
                        variant="outline"
                        className="border-primary text-primary rounded-xl hover:bg-primary/5 gap-2"
                    >
                        {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        Iniciar Prospecção
                    </Button>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary text-primary-foreground rounded-xl hover:opacity-90"
                    >
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
                                onLeadClick={handleLeadClick}
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
                        {activeLead ? <SortableItem lead={activeLead} onClick={() => { }} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <LeadDetailsModal
                lead={selectedLead}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveLead}
            />

            <AddLeadModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddLead}
            />
        </div>
    );
}
