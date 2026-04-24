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
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, User, Phone, MessageSquare, Calendar, CheckCircle, XCircle, Search, RefreshCw, Bot, Trash2, ArrowLeftRight, Mail, AlertCircle } from "lucide-react";
import LeadDetailsModal from "./LeadDetailsModal";
import AddLeadModal from "./AddLeadModal";
import ProspectingModal from "./ProspectingModal";
import { getDashboardAnalytics } from "./leads/actions"; // Apenas o fetch de dados inicial (Server-side)
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Send } from "lucide-react";

const CARD_COLORS = [
    { name: "Padrão", value: "" },
    { name: "Azul", value: "bg-blue-500/10 border-blue-500/20" },
    { name: "Verde", value: "bg-emerald-500/10 border-emerald-500/20" },
    { name: "Amarelo", value: "bg-yellow-500/10 border-yellow-500/20" },
    { name: "Vermelho", value: "bg-red-500/10 border-red-500/20" },
    { name: "Roxo", value: "bg-purple-500/10 border-purple-500/20" },
];

const STAGE_COLORS: Record<string, string> = {
    "Novo Lead": "bg-slate-400",
    "Em Atendimento (IA)": "bg-yellow-400",
    "Qualificação": "bg-amber-400",
    "Negociação": "bg-blue-400",
    "Vendido": "bg-emerald-500",
    "Perdido": "bg-red-500"
};

function getStageColor(name: string) {
    return STAGE_COLORS[name] || "bg-slate-400";
}

function SortableItem({ lead, onClick, onDelete, onColorChange }: { 
    lead: any; 
    onClick: () => void;
    onDelete: (id: string) => void;
    onColorChange: (id: string, color: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id });

    const meta = (lead.metaData as any) || {};
    const cardColorClass = meta.cardColor || "";
    const isAiActive = lead.aiActive === "true";

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
            className={`group relative border rounded-xl p-4 mb-3 shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                cardColorClass ? cardColorClass : "bg-card border-border hover:border-primary"
            }`}
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

                {lead.email && (
                    <div className="flex items-center text-xs text-muted-foreground gap-2 w-fit">
                        <Mail className="w-3 h-3 text-blue-500" />
                        <span className="truncate max-w-[170px]" title={lead.email}>
                            {lead.email}
                        </span>
                    </div>
                )}
                {meta.niche && (
                    <div className="text-[10px] uppercase font-black tracking-widest text-primary/80 bg-primary/10 w-fit px-2 py-0.5 rounded-md border border-primary/20 truncate max-w-[180px]">
                        [NICHO]: {meta.niche}
                    </div>
                )}
                <div className="text-sm font-black text-foreground mb-2">
                    {lead.value}
                </div>

                {lead.outreachStatus === "invalid_phone_email_available" && (
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 w-fit mb-2">
                        <AlertCircle className="w-2.5 h-2.5" />
                        WhatsApp Inválido (E-mail Disponível)
                    </div>
                )}
                {lead.outreachStatus === "failed_invalid_contact" && (
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100 w-fit mb-2">
                        <XCircle className="w-2.5 h-2.5" />
                        Número Inválido
                    </div>
                )}
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
                        className={`h-7 w-7 rounded-lg hover:bg-accent ${isAiActive ? 'text-emerald-500' : ''}`}
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            // Future: open chat directly
                        }}
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-accent"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Ações do Lead</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground mt-2 px-2">Alterar Cor</DropdownMenuLabel>
                            <div className="grid grid-cols-3 gap-1 p-2">
                                {CARD_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        title={c.name}
                                        className={`h-6 w-full rounded-md border border-border/50 ${c.value || "bg-card"} 
                                            ${cardColorClass === c.value ? "ring-2 ring-primary" : ""}`}
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            onColorChange(lead.id, c.value);
                                        }}
                                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                                    />
                                ))}
                            </div>
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onDelete(lead.id);
                                }}
                                onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Excluir Lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

function KanbanColumn({ stage, leads, onLeadClick, onDeleteLead, onColorChange, onDeleteStage }: { 
    stage: any; 
    leads: any[]; 
    onLeadClick: (lead: any) => void;
    onDeleteLead: (id: string) => void;
    onColorChange: (id: string, color: string) => void;
    onDeleteStage: (id: string) => void;
}) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ 
        id: stage.id,
        data: {
            type: "column",
            stage
        }
    });

    const [isSending, setIsSending] = useState(false);

    const handleMassSending = async () => {
        if (!confirm(`Deseja iniciar o disparo em massa para todos os leads aguardando envio na coluna "${stage.name}"? As mensagens serão enviadas aos poucos para evitar bloqueios.`)) {
            return;
        }
        setIsSending(true);
        try {
            const response = await fetch('/api/outreach/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId: stage.id })
            });

            const res = await response.json();

            if (res.success) {
                toast.success(`Disparo iniciado! ${res.count} leads foram agendados para contato.`);
                window.location.reload();
            } else {
                toast.error(res.error || "Erro ao iniciar disparo em massa.");
            }
        } catch (err) {
            toast.error("Erro técnico ao iniciar disparos.");
        } finally {
            setIsSending(false);
        }
    };

    const handleClearLeads = async () => {
        if (!confirm(`Tem certeza que deseja remover TODOS os leads da coluna "${stage.name}"? Esta ação não pode ser desfeita.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/leads/bulk-delete?stageId=${stage.id}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                toast.success(`Coluna "${stage.name}" limpa com sucesso!`);
                window.location.reload();
            } else {
                toast.error("Erro ao limpar leads da coluna.");
            }
        } catch (err) {
            toast.error("Erro de conexão ao tentar limpar leads.");
        }
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="flex-shrink-0 w-80 bg-muted/30 rounded-2xl p-4 flex flex-col max-h-full border border-border/50 group/column"
        >
            <div className="flex items-center justify-between mb-4 px-1" {...attributes} {...listeners}>
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover/column:opacity-100 transition-opacity" />
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-sm`} />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">{stage.name}</h3>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {leads.length}
                    </span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-border">
                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Opções da Coluna</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => {
                                // Esse botão não estava implementado, vou deixar para consistência se o usuário quiser adicionar manual
                                toast.info("Use o botão 'Adicionar Lead' no topo.");
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Lead
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="cursor-pointer text-emerald-600 focus:text-emerald-700"
                            disabled={isSending}
                            onClick={handleMassSending}
                        >
                            <Send className={`w-4 h-4 mr-2 ${isSending ? 'animate-pulse' : ''}`} />
                            {isSending ? 'Iniciando...' : 'Disparar WhatsApp'}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                            className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer font-bold"
                            onClick={handleClearLeads}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Limpar Leads (Todos)
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                            className="text-muted-foreground focus:bg-muted/50 cursor-pointer"
                            onClick={() => {
                                if (confirm(`Deseja excluir a coluna "${stage.name}"? Os leads serão movidos para a primeira coluna.`)) {
                                    onDeleteStage(stage.id);
                                }
                            }}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Excluir Coluna
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div ref={setNodeRef} className="flex-1 overflow-y-auto min-h-[150px] custom-scrollbar pr-1">
                <SortableContext
                    items={leads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {leads.map((lead) => (
                        <SortableItem 
                            key={lead.id} 
                            lead={lead} 
                            onClick={() => onLeadClick(lead)}
                            onDelete={onDeleteLead}
                            onColorChange={onColorChange}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

export default function CRMKanban({ initialLeads = [], initialStages = [] }: { initialLeads?: any[], initialStages?: any[] }) {
    const [leadsList, setLeadsList] = useState(initialLeads);
    const [stagesList, setStagesList] = useState(initialStages);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isProspectingModalOpen, setIsProspectingModalOpen] = useState(false);
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

        const activeData = active.data.current;
        const overData = over.data.current;

        // Caso seja reordenação de colunas (estágios)
        if (activeData?.type === "column" && overData?.type === "column") {
            if (active.id !== over.id) {
                setStagesList((prev: any) => {
                    const oldIndex = prev.findIndex((s: any) => s.id === active.id);
                    const newIndex = prev.findIndex((s: any) => s.id === over.id);
                    return arrayMove(prev, oldIndex, newIndex);
                });
            }
            return;
        }

        // Caso seja arraste de lead
        const activeLead = leadsList.find((l: any) => l.id === active.id);
        if (!activeLead) return;

        const overId = over.id;
        const isOverAStage = stagesList.some((s: any) => s.id === overId);
        let newStageId = overId;

        if (!isOverAStage) {
            const overLead = leadsList.find((l: any) => l.id === overId);
            newStageId = overLead ? overLead.stageId : activeLead?.stageId;
        }

        if (newStageId && activeLead.stageId !== newStageId) {
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

        const activeData = active.data.current;
        const overData = over.data.current;

        if (active.id !== over.id) {
            if (activeData?.type === "column" && overData?.type === "column") {
                // Sincronizar com o banco após a reordenação visual estar completa
                const currentStages = [...stagesList];
                const updateOrders = async () => {
                    for (let i = 0; i < currentStages.length; i++) {
                        await fetch('/api/crm/stage', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ stageId: currentStages[i].id, newOrder: i })
                        });
                    }
                };
                updateOrders();
                setActiveId(null);
                return;
            }

            const oldIndex = leadsList.findIndex((l: any) => l.id === active.id);
            const newIndex = leadsList.findIndex((l: any) => l.id === over.id);

            if (newIndex !== -1) {
                setLeadsList((items: any) => arrayMove(items, oldIndex, newIndex));
            }
        } else {
            const lead = leadsList.find((l: any) => l.id === active.id);
            if (lead) {
                await fetch(`/api/leads/${active.id}`, { // Corrigido endpoint de atualização de lead
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stageId: lead.stageId })
                });
            }
        }

        setActiveId(null);
    };

    const handleAddStage = async () => {
        const name = prompt("Nome da nova coluna:");
        if (!name) return;

        const response = await fetch('/api/crm/stage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const res = await response.json();

        if (res.success) {
            toast.success("Coluna adicionada!");
            window.location.reload();
        } else {
            toast.error("Erro ao adicionar coluna.");
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        const response = await fetch(`/api/crm/stage?id=${stageId}`, {
            method: 'DELETE',
        });
        const res = await response.json();

        if (res.success) {
            toast.success("Coluna excluída.");
            window.location.reload();
        } else {
            toast.error("Erro ao excluir coluna.");
        }
    };

    const handleLeadClick = (lead: any) => {
        setSelectedLead(lead);
        setIsModalOpen(true);
    };

    const handleSaveLead = async (leadId: string, updatedData: any) => {
        setLeadsList((prev: any) => prev.map((l: any) => l.id === leadId ? updatedData : l));
        await fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                metaData: updatedData.metaData,
                phone: updatedData.phone,
                email: updatedData.email,
                source: updatedData.source,
                name: updatedData.name
            })
        });
    };

    const handleAddLead = async (newLeadData: any) => {
        const response = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLeadData)
        });
        const res = await response.json();

        if (res.success) {
            setLeadsList((prev: any) => [res.lead, ...prev]);
            toast.success("Lead adicionado com sucesso!");
        } else {
            toast.error("Erro ao salvar lead no banco de dados.");
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm("Tem certeza que deseja excluir este lead?")) return;
        
        const response = await fetch(`/api/leads/${leadId}`, {
            method: 'DELETE',
        });
        const res = await response.json();

        if (res.success) {
            setLeadsList((prev: any) => prev.filter((l: any) => l.id !== leadId));
            toast.success("Lead excluído com sucesso.");
        } else {
            toast.error("Erro ao excluir lead.");
        }
    };

    const handleColorChange = async (leadId: string, color: string) => {
        setLeadsList((prev: any) => 
            prev.map((l: any) => l.id === leadId ? { ...l, metaData: { ...l.metaData, cardColor: color } } : l)
        );
        await fetch(`/api/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardColor: color })
        });
    };

    const handleStartOutreach = async () => {
        try {
            setIsExporting(true);
            const response = await fetch('/api/outreach/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const result = await response.json();

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
                    
                    const response = await fetch('/api/leads/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadsData: importedLeads })
                    });
                    const res = await response.json();

                    if (res.success) {
                        toast.success(`${importedLeads.length} leads importados com sucesso!`);
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

                const response = await fetch('/api/leads/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadsData: importedLeads })
                });
                const res = await response.json();

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
                        onClick={() => setIsProspectingModalOpen(true)}
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
                        <SortableContext 
                            items={stagesList.map(s => s.id)} 
                            strategy={horizontalListSortingStrategy}
                        >
                            {stagesList.map((stage: any) => (
                                <KanbanColumn
                                    key={stage.id}
                                    stage={{ ...stage, color: getStageColor(stage.name), onDelete: () => handleDeleteStage(stage.id) }}
                                    leads={leadsList.filter((l: any) => l.stageId === stage.id)}
                                    onLeadClick={handleLeadClick}
                                    onDeleteLead={handleDeleteLead}
                                    onColorChange={handleColorChange}
                                    onDeleteStage={handleDeleteStage}
                                />
                            ))}
                        </SortableContext>

                        {/* Add Column Button */}
                        <div className="flex-shrink-0 w-80 bg-muted/10 rounded-2xl p-4 flex flex-col items-center justify-center border-2 border-dashed border-border/50 hover:bg-muted/20 transition-all group cursor-pointer"
                            onClick={handleAddStage}
                        >
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Nova Coluna</span>
                        </div>
                    </div>

                    <DragOverlay
                        dropAnimation={{
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: { active: { opacity: "0.5" } },
                            }),
                        }}
                    >
                        {activeLead ? (
                            <SortableItem 
                                lead={activeLead} 
                                onClick={() => { }} 
                                onDelete={() => { }} 
                                onColorChange={() => { }} 
                            />
                        ) : activeId && stagesList.find((s: any) => s.id === activeId) ? (
                            <div className="opacity-80 scale-105 rotate-2 transition-transform">
                                <KanbanColumn
                                    stage={stagesList.find((s: any) => s.id === activeId)}
                                    leads={leadsList.filter((l: any) => l.stageId === activeId)}
                                    onLeadClick={() => { }}
                                    onDeleteLead={() => { }}
                                    onColorChange={() => { }}
                                    onDeleteStage={() => { }}
                                />
                            </div>
                        ) : null}
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

            <ProspectingModal 
                isOpen={isProspectingModalOpen}
                onClose={() => setIsProspectingModalOpen(false)}
            />
        </div>
    );
}
