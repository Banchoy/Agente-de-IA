
"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    User, Phone, Mail, Calendar,
    Briefcase, CreditCard, CheckCircle2,
    Plus, Trash2, Save
} from "lucide-react";

interface LeadDetailsModalProps {
    lead: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (leadId: string, updatedData: any) => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose, onSave }: LeadDetailsModalProps) {
    const [metadata, setMetadata] = useState<any[]>([]);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");

    useEffect(() => {
        if (lead?.metaData) {
            const items = Object.entries(lead.metaData).map(([key, value]) => ({
                key,
                value: value as string,
            }));
            setMetadata(items);
        } else {
            setMetadata([]);
        }
    }, [lead]);

    if (!lead) return null;

    const handleAddMetadata = () => {
        if (newKey && newValue) {
            setMetadata([...metadata, { key: newKey, value: newValue }]);
            setNewKey("");
            setNewValue("");
        }
    };

    const handleRemoveMetadata = (index: number) => {
        setMetadata(metadata.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const metaDataObj = metadata.reduce((acc: any, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
        onSave(lead.id, { ...lead, metaData: metaDataObj });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] border-zinc-200 rounded-3xl shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                            <User size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight">{lead.name}</DialogTitle>
                            <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-zinc-50">
                                    {lead.source}
                                </Badge>
                                <Badge className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                                    Status: {lead.stageId}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Separator className="my-4 bg-zinc-100" />
                </DialogHeader>

                <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Informações Básicas */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Informações de Contato</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase">WhatsApp</Label>
                                <div className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-semibold">
                                    <Phone size={14} className="text-zinc-400" />
                                    {lead.phone}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase">E-mail</Label>
                                <div className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-semibold">
                                    <Mail size={14} className="text-zinc-400" />
                                    {lead.email || "Não informado"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Campos Personalizados (Metadata) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Dados do Qualificação (Nicho)</h4>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900">
                                Sugestões IA
                            </Button>
                        </div>

                        <div className="grid gap-3">
                            {metadata.map((item, index) => (
                                <div key={index} className="flex items-center gap-2 group animate-in fade-in slide-in-from-top-1">
                                    <div className="flex-1 grid grid-cols-3 bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-zinc-100/50 p-2 text-[10px] font-bold uppercase text-zinc-500 border-r border-zinc-100">
                                            {item.key}
                                        </div>
                                        <div className="col-span-2 p-2 text-sm font-medium text-zinc-900 italic">
                                            {item.value}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-rose-50"
                                        onClick={() => handleRemoveMetadata(index)}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 p-3 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl mt-4">
                            <div className="flex-1 space-y-2">
                                <Input
                                    placeholder="Nome do campo (ex: Idade, Orçamento)"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    className="h-8 text-xs rounded-lg border-zinc-200 focus-visible:ring-zinc-900"
                                />
                                <Input
                                    placeholder="Valor (ex: 30, R$ 5000)"
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    className="h-8 text-xs rounded-lg border-zinc-200 focus-visible:ring-zinc-900"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-auto bg-zinc-200 hover:bg-zinc-900 hover:text-white transition-all rounded-xl px-4"
                                onClick={handleAddMetadata}
                            >
                                <Plus size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-zinc-100 pt-6">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-8 font-bold shadow-lg active:scale-95 transition-all gap-2"
                    >
                        <Save size={16} />
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
