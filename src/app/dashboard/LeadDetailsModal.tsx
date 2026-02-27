
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
    Plus, Trash2, Save, Sparkles
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
                ...(lead.metaData || {})
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

    const [editableSuggestions, setEditableSuggestions] = useState<any[]>([]);
    const [captureTimeLabel, setCaptureTimeLabel] = useState<string>("0");

    useEffect(() => {
        if (lead?.createdAt) {
            const diff = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
            setCaptureTimeLabel(diff >= 0 ? String(diff) : "0");
        } else {
            setCaptureTimeLabel("0");
        }
    }, [lead]);

    const tabs = [
        { id: "dados", label: "Dados cadastrais" },
        { id: "qualificacao", label: "Qualificação / Negociação" },
        { id: "mensagens", label: "Mensagens & IA" },
        { id: "cotas", label: "Cotas" },
    ];

    useEffect(() => {
        if (lead) {
            setEditableSuggestions([
                {
                    id: 1,
                    title: "Primeiro Contato",
                    message: `Olá ${lead.name}! Vi seu interesse em nosso sistema através do Meta Ads. Como posso te ajudar hoje?`,
                    type: "Saudação"
                },
                {
                    id: 2,
                    title: "Pedido de Qualificação",
                    message: `Olá ${lead.name}, para eu te passar os melhores valores, qual seria a sua renda mensal aproximada e o valor de crédito que você busca?`,
                    type: "Qualificação"
                },
                {
                    id: 3,
                    title: "Agendamento",
                    message: `Podemos marcar uma breve ligação de 5 minutos para eu te explicar como funciona o nosso plano de ${formData.product || 'consórcio'}?`,
                    type: "Conversão"
                }
            ]);
        }
    }, [lead, formData.product]);

    const handleMessageChange = (id: number, newMessage: string) => {
        setEditableSuggestions(prev => prev.map(s => s.id === id ? { ...s, message: newMessage } : s));
    };

    const handleRegenerate = (id: number) => {
        // Mocking AI regeneration
        const suggestion = editableSuggestions.find(s => s.id === id);
        if (suggestion) {
            const variations = [
                `Ei ${lead.name}, tudo bem? Notei que você se cadastrou no nosso anúncio. Que tal batermos um papo?`,
                `Olá ${lead.name}! Sou consultor da LeadDirector. Vi seu interesse em ${formData.product || 'nossos produtos'}.`,
                `Oi ${lead.name}, aqui é da equipe de vendas. Recebi sua solicitação de contato. Qual melhor horário para falarmos?`
            ];
            const randomVar = variations[Math.floor(Math.random() * variations.length)];
            handleMessageChange(id, randomVar);
        }
    };

    const handleSendWhatsApp = (message: string) => {
        const encodedMsg = encodeURIComponent(message);
        const cleanPhone = formData.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    };

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
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lead ID: {String(lead.id).slice(0, 8)}</span>
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

                            <div className="flex gap-8 overflow-x-auto no-scrollbar">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
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

                            {activeTab === "mensagens" && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 items-start">
                                        <Sparkles className="text-emerald-600 mt-1 flex-shrink-0" size={18} />
                                        <div>
                                            <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">IA Co-Pilot</h4>
                                            <p className="text-xs text-emerald-600/80 font-medium">Edite as sugestões ou peça uma nova variação para a IA antes de enviar.</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        {editableSuggestions.map((suggestion) => (
                                            <div key={suggestion.id} className="group p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{suggestion.type}</span>
                                                        <h5 className="text-sm font-black text-zinc-900">{suggestion.title}</h5>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleRegenerate(suggestion.id)}
                                                            className="h-9 w-9 rounded-xl border-zinc-200 text-zinc-400 hover:text-emerald-600 hover:border-emerald-200"
                                                            title="Regerar sugestão"
                                                        >
                                                            <Plus className="w-4 h-4 rotate-45 group-hover:rotate-0 transition-transform" />
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleSendWhatsApp(suggestion.message)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 text-[10px] font-black uppercase gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                                                        >
                                                            <Phone size={14} />
                                                            Mandar no WhatsApp
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    value={suggestion.message}
                                                    onChange={(e) => handleMessageChange(suggestion.id, e.target.value)}
                                                    className="text-xs text-zinc-600 font-medium leading-relaxed italic bg-zinc-50 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl resize-none min-h-[80px]"
                                                />
                                            </div>
                                        ))}
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
                                            <span className="text-[10px] font-black text-zinc-900 uppercase">Lead Capturado</span>
                                            <span className="text-[9px] font-bold text-zinc-400">há {captureTimeLabel} min</span>
                                        </div>
                                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs text-zinc-600 leading-relaxed font-medium">
                                            Origem: <span className="font-black text-zinc-900">{lead.source}</span>
                                            {lead.metaData?.form_responses && (
                                                <div className="mt-3 space-y-2 pt-3 border-t border-zinc-200/50">
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase mb-2">Respostas do Formulário:</p>
                                                    {Object.entries(lead.metaData.form_responses).map(([question, answer]: [string, any]) => (
                                                        <div key={question} className="bg-white p-2 rounded-lg border border-zinc-100 shadow-sm">
                                                            <p className="text-[10px] font-bold text-zinc-500">{question}</p>
                                                            <p className="text-xs font-black text-zinc-900">{answer}</p>
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
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase">Qualificação IA</span>
                                                <span className="text-[9px] font-bold text-zinc-400">automático</span>
                                            </div>
                                            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-700 leading-relaxed font-medium">
                                                {lead.metaData.ai_summary}
                                            </div>
                                        </div>
                                    </div>
                                )}
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
