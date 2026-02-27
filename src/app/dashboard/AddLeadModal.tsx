
"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User, Phone, Mail, CreditCard, Briefcase, Plus } from "lucide-react";

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newLead: any) => void;
}

export default function AddLeadModal({ isOpen, onClose, onAdd }: AddLeadModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        product: "",
        value: "",
        credit: "",
        income: "",
        source: "Manual",
        stageId: "prospecting"
    });

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newLead = {
            id: Math.random().toString(36).substr(2, 9),
            ...formData,
            createdAt: new Date().toISOString(),
            metaData: {
                product: formData.product,
                credit: formData.credit,
                income: formData.income,
                source: formData.source,
                manual_entry: "true"
            }
        };

        onAdd(newLead);
        setFormData({
            name: "",
            phone: "",
            email: "",
            product: "",
            value: "",
            credit: "",
            income: "",
            source: "Manual",
            stageId: "prospecting"
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 border-zinc-200 rounded-3xl shadow-2xl overflow-hidden bg-white">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="px-8 pt-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                                <Plus size={24} />
                            </div>
                            Novo Lead Manual
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-zinc-200 focus-visible:ring-primary"
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Telefone (WhatsApp)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <Input
                                        required
                                        value={formData.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-zinc-200 focus-visible:ring-primary"
                                        placeholder="+55 11 99999-9999"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">E-mail</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-zinc-200 focus-visible:ring-primary"
                                        placeholder="cliente@email.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Produto de Interesse</Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <Input
                                        required
                                        value={formData.product}
                                        onChange={(e) => handleChange("product", e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-zinc-200 focus-visible:ring-primary"
                                        placeholder="Ex: Imóvel Prime"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Valor do Crédito</Label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <Input
                                        value={formData.credit}
                                        onChange={(e) => handleChange("credit", e.target.value)}
                                        className="pl-10 h-11 rounded-xl border-zinc-200 focus-visible:ring-primary font-bold text-emerald-600"
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Estágio Inicial</Label>
                                <Select onValueChange={(v: string) => handleChange("stageId", v)} defaultValue="prospecting">
                                    <SelectTrigger className="h-11 rounded-xl border-zinc-200">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prospecting">Prospecção</SelectItem>
                                        <SelectItem value="qualification">Qualificação</SelectItem>
                                        <SelectItem value="negotiation">Negociação</SelectItem>
                                        <SelectItem value="sold">Vendido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">Valor Estimado</Label>
                                <Input
                                    value={formData.value}
                                    onChange={(e) => handleChange("value", e.target.value)}
                                    className="h-11 rounded-xl border-zinc-200 focus-visible:ring-primary"
                                    placeholder="R$ 0"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-8 pb-8 pt-4 gap-3 bg-zinc-50/50">
                        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary hover:opacity-90 text-primary-foreground rounded-xl px-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                            Criar Lead
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
