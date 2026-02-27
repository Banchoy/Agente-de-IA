
"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    User, Phone, Mail, Calendar,
    Briefcase, Sparkles, Plus
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
    const [editableSuggestions, setEditableSuggestions] = useState<any[]>([]);
    const [captureTimeLabel, setCaptureTimeLabel] = useState<string>("0");

    useEffect(() => {
        if (lead) {
            setFormData({
                phone: lead.phone || "",
                email: lead.email || "",
                source: lead.source || "",
                ...(lead.metaData || {})
            });

            if (lead.createdAt) {
                const diff = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
                setCaptureTimeLabel(diff >= 0 ? String(diff) : "0");
            }

            setEditableSuggestions([
                {
                    id: 1,
                    title: "Primeiro Contato",
                    message: `Olá ${lead.name || 'Cliente'}! Vi seu interesse em nosso sistema através do Meta Ads. Como posso te ajudar hoje?`,
                    type: "Saudação"
                },
                {
                    id: 2,
                    title: "Pedido de Qualificação",
                    message: `Olá ${lead.name || 'Cliente'}, para eu te passar os melhores valores, qual seria a sua renda mensal aproximada e o valor de crédito que você busca?`,
                    type: "Qualificação"
                },
                {
                    id: 3,
                    title: "Agendamento",
                    message: `Podemos marcar uma breve ligação de 5 minutos para eu te explicar como funciona o nosso plano?`,
                    type: "Conversão"
                }
            ]);
        }
    }, [lead]);

    if (!lead) return null;

    const tabs = [
        { id: "dados", label: "Dados cadastrais" },
        { id: "qualificacao", label: "Qualificação" },
        { id: "mensagens", label: "Mensagens & IA" },
        { id: "cotas", label: "Cotas" },
    ];

    const handleChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const { phone, email, source, ...metaData } = formData;
        onSave(lead.id, { ...lead, phone, email, source, metaData });
        onClose();
    };

    const handleMessageChange = (id: number, newMessage: string) => {
        setEditableSuggestions(prev => prev.map(s => s.id === id ? { ...s, message: newMessage } : s));
    };

    const handleRegenerate = (id: number) => {
        const suggestion = editableSuggestions.find(s => s.id === id);
        if (suggestion) {
            const variations = [
                `Ei ${lead.name || 'cliente'}, tudo bem? Notei seu interesse no nosso anúncio. Vamos conversar?`,
                `Olá! Vi seu interesse em ${formData.product || 'nossos produtos'}. Qual o melhor horário para falarmos?`,
                `Oi! Sou consultor da LeadDirector. Recebi sua solicitação de contato sobre ${formData.product || 'consórcio'}.`
            ];
            const randomVar = variations[Math.floor(Math.random() * variations.length)];
            handleMessageChange(id, randomVar);
        }
    };

    const handleSendWhatsApp = (message: string) => {
        const encodedMsg = encodeURIComponent(message);
        const cleanPhone = (formData.phone || "").replace(/\D/g, '');
        if (cleanPhone) window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] p-0 border-zinc-200 rounded-3xl shadow-2xl overflow-hidden bg-white">
                <div className="flex h-[80vh]">
                    <div className="flex-1 flex flex-col bg-zinc-50/50">
                        {/* Tab Headers */}
                        <div className="px-6 pt-6 border-b border-zinc-100 bg-white">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{lead.name || 'Sem Nome'}</h2>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lead ID: {String(lead.id).slice(0, 8)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-8">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-400'}`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zinc-900" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {activeTab === "dados" && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400">E-mail</Label>
                                        <Input value={formData.email || ""} onChange={(e) => handleChange("email", e.target.value)} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400">Telefone</Label>
                                        <Input value={formData.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} className="rounded-xl" />
                                    </div>
                                </div>
                            )}

                            {activeTab === "mensagens" && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 text-emerald-700">
                                        <Sparkles size={18} />
                                        <p className="text-xs font-medium">Edite as sugestões da IA e envie diretamente para o WhatsApp.</p>
                                    </div>
                                    <div className="space-y-4">
                                        {Array.isArray(editableSuggestions) && editableSuggestions.map((suggestion) => (
                                            <div key={suggestion.id} className="p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-[9px] font-black uppercase text-zinc-400">{suggestion.type}</span>
                                                        <h5 className="text-sm font-black">{suggestion.title}</h5>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="icon" onClick={() => handleRegenerate(suggestion.id)} className="rounded-xl h-9 w-9">
                                                            <Plus size={14} className="rotate-45" />
                                                        </Button>
                                                        <Button onClick={() => handleSendWhatsApp(suggestion.message)} className="bg-emerald-600 text-white rounded-xl h-9 px-4 text-[10px] font-black uppercase gap-2">
                                                            <Phone size={14} /> WhatsApp
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Textarea value={suggestion.message} onChange={(e) => handleMessageChange(suggestion.id, e.target.value)} className="text-xs bg-zinc-50 border-none rounded-xl min-h-[80px]" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
                            <Button onClick={onClose} variant="ghost" className="rounded-xl">Voltar</Button>
                            <Button onClick={handleSave} className="bg-emerald-600 text-white rounded-xl px-8 font-black uppercase text-[10px]">Salvar Lead</Button>
                        </div>
                    </div>

                    {/* Right Side History */}
                    <div className="w-[350px] border-l border-zinc-100 flex flex-col bg-white overflow-hidden text-zinc-600">
                        <div className="p-6 border-b border-zinc-100 font-black text-xs uppercase text-zinc-400">Histórico</div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="relative pl-6 border-l-2 border-zinc-100 space-y-8">
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-zinc-900 border-4 border-white" />
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-black uppercase">
                                            <span>Lead Capturado</span>
                                            <span className="text-zinc-400">há {captureTimeLabel} min</span>
                                        </div>
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs">
                                            Origem: <span className="font-black text-zinc-900">{lead.source}</span>
                                            {lead.metaData?.form_responses && typeof lead.metaData.form_responses === 'object' && (
                                                <div className="mt-3 space-y-2 pt-3 border-t border-zinc-100">
                                                    {Object.entries(lead.metaData.form_responses).map(([q, a]: [string, any]) => (
                                                        <div key={q} className="bg-white p-2 rounded-lg border border-zinc-100">
                                                            <p className="text-[9px] font-bold text-zinc-400">{q}</p>
                                                            <p className="text-[11px] font-bold text-zinc-900">{String(a)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
