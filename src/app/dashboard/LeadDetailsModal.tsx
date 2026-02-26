
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
    const [activeTab, setActiveTab] = useState("dados");
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (lead) {
            setFormData({
                phone: lead.phone || "",
                email: lead.email || "",
                source: lead.source || "",
                ...lead.metaData
            });
        }
    }, [lead]);

    if (!lead) return null;

    const handleChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const { phone, email, source, ...metaData } = formData;
        onSave(lead.id, { ...lead, phone, email, source, metaData });
        onClose();
    };

    const tabs = [
        { id: "dados", label: "Dados cadastrais" },
        { id: "qualificacao", label: "Qualificação / Negociação" },
        { id: "cotas", label: "Cotas" },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] p-0 border-zinc-200 rounded-3xl shadow-2xl overflow-hidden bg-white">
                <div className="flex h-[80vh]">
                    {/* Left Side: Form */}
                    <div className="flex-1 flex flex-col bg-zinc-50/50">
                        {/* Header with Tabs */}
                        <div className="px-6 pt-6 border-b border-zinc-100 bg-white">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{lead.name}</h2>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lead ID: {lead.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="rounded-full h-8 text-[10px] font-black uppercase text-zinc-500 border-zinc-200 hover:bg-zinc-50">
                                        Vendedor: {lead.vendedor || "interCons"}
                                    </Button>
                                    <Badge className="rounded-full h-8 px-4 bg-zinc-100 text-zinc-600 hover:bg-zinc-100 border-none text-[10px] font-black uppercase">
                                        Etapa: {lead.stageId}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex gap-8">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                                            }`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zinc-900 animate-in fade-in slide-in-from-bottom-1" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {activeTab === "dados" && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nome Completo</Label>
                                        <Input
                                            value={lead.name}
                                            readOnly
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">E-mail</Label>
                                        <Input
                                            value={formData.email}
                                            onChange={(e) => handleChange("email", e.target.value)}
                                            placeholder="ex: cliente@email.com"
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Telefone Principal</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => handleChange("phone", e.target.value)}
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Origem do Lead</Label>
                                        <Input
                                            value={formData.source}
                                            onChange={(e) => handleChange("source", e.target.value)}
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-zinc-100/50 rounded-2xl border border-zinc-100">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">UTM Source</p>
                                            <p className="text-xs font-bold text-zinc-600">{formData.utm_source || "AD 02 - MODELO 3"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">UTM Medium</p>
                                            <p className="text-xs font-bold text-zinc-600">{formData.utm_medium || "[PR] [30-65+] [Imóveis]"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">UTM Campaign</p>
                                            <p className="text-xs font-bold text-zinc-600">{formData.utm_campaign || "CAPTAÇÃO DE LEADS"}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "qualificacao" && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Produto de Interesse</Label>
                                        <Input
                                            value={formData.product || ""}
                                            onChange={(e) => handleChange("product", e.target.value)}
                                            placeholder="ex: Imóveis, Automóveis"
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Administradora</Label>
                                        <Input
                                            value={formData.admin || ""}
                                            onChange={(e) => handleChange("admin", e.target.value)}
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Renda Mensal</Label>
                                        <Input
                                            value={formData.income || ""}
                                            onChange={(e) => handleChange("income", e.target.value)}
                                            placeholder="R$ 0,00"
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-medium focus-visible:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Crédito Desejado</Label>
                                        <Input
                                            value={formData.credit || ""}
                                            onChange={(e) => handleChange("credit", e.target.value)}
                                            placeholder="R$ 0,00"
                                            className="bg-white border-zinc-200 rounded-xl h-11 font-black text-emerald-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-4 pt-4 border-t border-zinc-100">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Paga aluguel?</Label>
                                                <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                                                    {["Sim", "Não", "Não sei"].map(val => (
                                                        <button
                                                            key={val}
                                                            onClick={() => handleChange("rent", val)}
                                                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.rent === val ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                                                        >
                                                            {val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Já simulou financiamento?</Label>
                                                <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                                                    {["Sim", "Não", "Não sei"].map(val => (
                                                        <button
                                                            key={val}
                                                            onClick={() => handleChange("simulation", val)}
                                                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.simulation === val ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                                                        >
                                                            {val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "cotas" && (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 animate-in fade-in duration-300">
                                    <Briefcase size={48} className="mb-4 text-zinc-300" />
                                    <h3 className="text-sm font-black uppercase tracking-widest">Nenhuma cota vinculada</h3>
                                    <p className="text-xs font-medium text-zinc-400 mt-2">As cotas aparecerão aqui após a negociação inicial.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-100 bg-white flex justify-between items-center">
                            <Button onClick={onClose} variant="ghost" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Voltar</Button>
                            <div className="flex gap-3">
                                <Button variant="outline" className="rounded-xl border-zinc-200 font-bold uppercase text-[10px] tracking-widest text-zinc-500">Marcar Negociação Futura</Button>
                                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200">Salvar Lead</Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: History */}
                    <div className="w-[350px] border-l border-zinc-100 flex flex-col bg-white">
                        <div className="p-6 border-b border-zinc-100">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Histórico de Atendimento</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="relative pl-6 border-l-2 border-zinc-100 space-y-8">
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-zinc-900 border-4 border-white shadow-sm" />
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-zinc-900 uppercase">Qualificação IA</span>
                                            <span className="text-[9px] font-bold text-zinc-400">há 2 horas</span>
                                        </div>
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs text-zinc-600 leading-relaxed font-medium">
                                            O lead demonstrou interesse em crédito imobiliário acima de R$ 300k. Possui entrada de 20% e busca parcelas de até R$ 2.500.
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-zinc-100 border-4 border-white shadow-sm" />
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase">Lead Capturado</span>
                                            <span className="text-[9px] font-bold text-zinc-400">20/dez 13:31</span>
                                        </div>
                                        <div className="p-4 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 text-xs text-zinc-400 font-medium">
                                            Origem: Facebook Leads (Campanha Imóveis 2024)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
                            <div className="relative">
                                <textarea
                                    placeholder="Escreva uma observação..."
                                    className="w-full bg-white border border-zinc-200 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-zinc-900 focus:outline-none min-h-[100px] resize-none shadow-sm"
                                />
                                <Button className="absolute bottom-3 right-3 h-8 px-4 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase">
                                    Adicionar Nota
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
