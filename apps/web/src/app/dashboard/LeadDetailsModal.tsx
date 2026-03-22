
"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    User, Phone, Sparkles, Plus, Briefcase
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
                try {
                    const diff = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
                    setCaptureTimeLabel(diff >= 0 ? String(diff) : "0");
                } catch (e) {
                    setCaptureTimeLabel("0");
                }
            } else {
                setCaptureTimeLabel("0");
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
                                <div className="flex gap-2">
                                    <Badge className="rounded-full h-8 px-4 bg-zinc-100 text-zinc-600 border-none text-[10px] font-black uppercase">
                                        Etapa: {lead.stageId}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex gap-8 overflow-x-auto no-scrollbar">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zinc-900 animate-in fade-in slide-in-from-bottom-1" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {activeTab === "dados" && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Nome Completo</Label>
                                        <Input value={lead.name || ""} readOnly className="bg-white border-zinc-200 rounded-xl h-11 font-medium" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">E-mail</Label>
                                        <Input value={formData.email || ""} onChange={(e) => handleChange("email", e.target.value)} className="bg-white border-zinc-200 rounded-xl h-11 font-medium" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Telefone Principal</Label>
                                        <Input value={formData.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} className="bg-white border-zinc-200 rounded-xl h-11 font-medium" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Origem do Lead</Label>
                                        <Input value={formData.source || ""} onChange={(e) => handleChange("source", e.target.value)} className="bg-white border-zinc-200 rounded-xl h-11 font-medium" />
                                    </div>
                                    <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-zinc-100/50 rounded-2xl border border-zinc-100">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">UTM Source</p>
                                            <p className="text-xs font-bold text-zinc-600">{formData.utm_source || "Não disponível"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">UTM Medium</p>
                                            <p className="text-xs font-bold text-zinc-600">{formData.utm_medium || "Não disponível"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase">UTM Campaign</p>
                                            <p className="text-xs font-bold text-zinc-600">{formData.utm_campaign || "Não disponível"}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "qualificacao" && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Produto de Interesse</Label>
                                        <Input value={formData.product || ""} onChange={(e) => handleChange("product", e.target.value)} placeholder="ex: Imóveis, Automóveis" className="bg-white border-zinc-200 rounded-xl h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Administradora</Label>
                                        <Input value={formData.admin || ""} onChange={(e) => handleChange("admin", e.target.value)} className="bg-white border-zinc-200 rounded-xl h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Renda Mensal</Label>
                                        <Input value={formData.income || ""} onChange={(e) => handleChange("income", e.target.value)} placeholder="R$ 0,00" className="bg-white border-zinc-200 rounded-xl h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Crédito Desejado</Label>
                                        <Input value={formData.credit || ""} onChange={(e) => handleChange("credit", e.target.value)} placeholder="R$ 0,00" className="bg-white border-zinc-200 rounded-xl h-11 font-black text-emerald-600" />
                                    </div>
                                    <div className="col-span-2 space-y-4 pt-4 border-t border-zinc-100">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Paga aluguel?</Label>
                                                <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                                                    {["Sim", "Não", "Não sei"].map(val => (
                                                        <button key={val} onClick={() => handleChange("rent", val)} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.rent === val ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400'}`}>
                                                            {val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Já simulou financiamento?</Label>
                                                <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                                                    {["Sim", "Não", "Não sei"].map(val => (
                                                        <button key={val} onClick={() => handleChange("simulation", val)} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.simulation === val ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400'}`}>
                                                            {val}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "mensagens" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 text-emerald-700">
                                        <Sparkles size={18} />
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase">IA Co-Pilot</h4>
                                            <p className="text-xs font-medium">Edite as sugestões da IA e envie diretamente para o WhatsApp.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {Array.isArray(editableSuggestions) && editableSuggestions.map((suggestion) => (
                                            <div key={suggestion.id} className="p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-[9px] font-black uppercase text-zinc-400">{suggestion.type}</span>
                                                        <h5 className="text-sm font-black">{suggestion.title}</h5>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="icon" onClick={() => handleRegenerate(suggestion.id)} className="rounded-xl h-9 w-9">
                                                            <Plus size={14} className="rotate-45" />
                                                        </Button>
                                                        <Button onClick={() => handleSendWhatsApp(suggestion.message)} className="bg-emerald-600 text-white rounded-xl h-9 px-4 text-[10px] font-black uppercase gap-2 transition-all shadow-lg shadow-emerald-100">
                                                            <Phone size={14} /> WhatsApp
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Textarea value={suggestion.message} onChange={(e) => handleMessageChange(suggestion.id, e.target.value)} className="text-xs bg-zinc-50 border-none rounded-xl min-h-[80px] italic" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "cotas" && (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 animate-in fade-in duration-300">
                                    <Briefcase size={48} className="mb-4 text-zinc-300" />
                                    <h3 className="text-sm font-black uppercase">Nenhuma cota vinculada</h3>
                                    <p className="text-xs font-medium text-zinc-400 mt-2">As cotas aparecerão aqui após a negociação inicial.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
                            <Button onClick={onClose} variant="ghost" className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Voltar</Button>
                            <Button onClick={handleSave} className="bg-emerald-600 text-white rounded-xl px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200">Salvar Lead</Button>
                        </div>
                    </div>

                    {/* Right Side History */}
                    <div className="w-[350px] border-l border-zinc-100 flex flex-col bg-white overflow-hidden text-zinc-600">
                        <div className="p-6 border-b border-zinc-100 font-black text-xs uppercase text-zinc-400">Histórico de Atendimento</div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="relative pl-6 border-l-2 border-zinc-100 space-y-8">
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-zinc-900 border-4 border-white shadow-sm" />
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                            <span>Lead Capturado</span>
                                            <span className="text-zinc-400">há {captureTimeLabel} min</span>
                                        </div>
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs">
                                            Origem: <span className="font-black text-zinc-900">{lead.source || "Meta Ads"}</span>
                                            {lead.metaData?.form_responses && typeof lead.metaData.form_responses === 'object' && (
                                                <div className="mt-3 space-y-2 pt-3 border-t border-zinc-100">
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-2">Respostas do Formulário:</p>
                                                    {Object.entries(lead.metaData.form_responses).map(([q, a]: [string, any]) => (
                                                        <div key={q} className="bg-white p-2 rounded-lg border border-zinc-100 shadow-sm">
                                                            <p className="text-[9px] font-bold text-zinc-400">{q}</p>
                                                            <p className="text-[11px] font-black text-zinc-900">{String(a)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {lead.metaData?.ai_summary && (
                                    <div className="relative">
                                        <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-black uppercase text-emerald-600">
                                                <span>Qualificação IA</span>
                                                <span className="text-zinc-400">automático</span>
                                            </div>
                                            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-700 leading-relaxed font-medium">
                                                {lead.metaData.ai_summary}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
