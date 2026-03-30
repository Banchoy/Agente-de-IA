"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Mail, Send, Loader2, CheckCircle2, Users, AlertTriangle, Sparkles, Search, ChevronDown, Eye } from "lucide-react";
import { toast } from "sonner";
import { getLeadsWithEmail, sendBulkEmails, sendTestEmail } from "./actions";

export default function EmailsPage() {
    const [leadsWithEmail, setLeadsWithEmail] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [fromName, setFromName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        setIsLoading(true);
        const data = await getLeadsWithEmail();
        setLeadsWithEmail(data);
        setIsLoading(false);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLeads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const filteredLeads = leadsWithEmail.filter(l => {
        const q = searchQuery.toLowerCase();
        return (
            l.name?.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) ||
            l.source?.toLowerCase().includes(q)
        );
    });

    const handleSendBulk = async () => {
        if (selectedIds.size === 0) {
            toast.error("Selecione pelo menos um lead para enviar.");
            return;
        }
        if (!subject.trim()) {
            toast.error("O assunto do e-mail é obrigatório.");
            return;
        }
        if (!body.trim()) {
            toast.error("O corpo do e-mail é obrigatório.");
            return;
        }

        setIsSending(true);
        setSendResult(null);

        try {
            const result = await sendBulkEmails(
                Array.from(selectedIds),
                subject,
                body,
                fromName || undefined
            );

            if (result.success) {
                setSendResult(result);
                toast.success(`${result.sent} e-mails enviados com sucesso!`);
                setSelectedIds(new Set());
            } else {
                toast.error(result.error || "Erro ao enviar e-mails.");
            }
        } catch (err) {
            toast.error("Erro técnico ao processar o envio.");
        } finally {
            setIsSending(false);
        }
    };

    const handleSendTest = async () => {
        if (!subject.trim() || !body.trim()) {
            toast.error("Preencha o assunto e o corpo antes de testar.");
            return;
        }

        const testEmail = prompt("Digite o e-mail para receber o teste:");
        if (!testEmail) return;

        try {
            const result = await sendTestEmail(testEmail, subject, body, fromName || undefined);
            if (result.success) {
                toast.success(`E-mail de teste enviado para ${testEmail}!`);
            } else {
                toast.error(`Erro: ${JSON.stringify(result.error)}`);
            }
        } catch (err) {
            toast.error("Erro ao enviar e-mail de teste.");
        }
    };

    // Preview do template com dados do primeiro lead selecionado
    const previewLead = filteredLeads.find(l => selectedIds.has(l.id)) || filteredLeads[0];
    const previewHtml = body
        .replace(/{nome}/gi, previewLead?.name || "João Silva")
        .replace(/{empresa}/gi, (previewLead?.metaData as any)?.title || "Empresa XYZ")
        .replace(/{nicho}/gi, (previewLead?.metaData as any)?.niche || "Serviços")
        .replace(/\n/g, "<br/>");

    return (
        <div className="h-full flex flex-col space-y-6 overflow-auto pb-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                            <Mail className="w-7 h-7 text-primary" />
                        </div>
                        E-mail Marketing
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        Dispare e-mails personalizados em massa para seus leads.
                    </p>
                </div>

                <div className="hidden lg:flex gap-3 items-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl shadow-sm">
                        <Users size={16} className="text-blue-500" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {leadsWithEmail.length} leads com e-mail
                        </span>
                    </div>
                </div>
            </div>

            {/* Result Banner */}
            {sendResult && (
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 animate-in slide-in-from-top">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                        <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            Envio concluído! {sendResult.sent}/{sendResult.total} e-mails enviados.
                        </p>
                        {sendResult.errors > 0 && (
                            <p className="text-xs text-amber-600">{sendResult.errors} falhas de envio.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left: Template Editor */}
                <div className="flex flex-col space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                                Template do E-mail
                            </h2>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                Nome do Remetente (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Bruno Silva"
                                className="w-full rounded-xl bg-muted/30 border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                value={fromName}
                                onChange={e => setFromName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                Assunto *
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: {nome}, tenho uma proposta para sua empresa"
                                className="w-full rounded-xl bg-muted/30 border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                Corpo do E-mail *
                            </label>
                            <textarea
                                placeholder={`Olá {nome},\n\nVi que a {empresa} atua no segmento de {nicho} e gostaria de apresentar uma solução...\n\nAtenciosamente,\nSua Equipe`}
                                className="w-full rounded-xl bg-muted/30 border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all min-h-[200px] resize-none"
                                value={body}
                                onChange={e => setBody(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 rounded-xl border border-primary/10">
                            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                            <p className="text-[11px] text-muted-foreground">
                                Use <code className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">{"{nome}"}</code>, <code className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">{"{empresa}"}</code> e <code className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">{"{nicho}"}</code> para personalizar.
                            </p>
                        </div>

                        {/* Preview Toggle */}
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            {showPreview ? "Ocultar pré-visualização" : "Pré-visualizar e-mail"}
                        </button>

                        {showPreview && previewLead && (
                            <div className="bg-background border border-border rounded-xl p-5 space-y-3 animate-in slide-in-from-top">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Pré-visualização ({previewLead.name})
                                </div>
                                <div className="border-b border-border pb-2">
                                    <p className="text-sm font-bold">{subject
                                        .replace(/{nome}/gi, previewLead.name || "")
                                        .replace(/{empresa}/gi, (previewLead.metaData as any)?.title || "")
                                        .replace(/{nicho}/gi, (previewLead.metaData as any)?.niche || "")
                                    }</p>
                                </div>
                                <div
                                    className="text-sm text-muted-foreground leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSendTest}
                            disabled={isSending}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card text-sm font-bold hover:bg-muted/50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Mail className="w-4 h-4" />
                            Enviar Teste
                        </button>

                        <button
                            onClick={handleSendBulk}
                            disabled={isSending || selectedIds.size === 0}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando {selectedIds.size} e-mails...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Disparar para {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Lead Selector */}
                <div className="flex flex-col space-y-4 min-h-0">
                    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                        {/* Search and Select All */}
                        <div className="p-4 border-b border-border space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                                    Selecionar Destinatários
                                </h2>
                            </div>

                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, e-mail ou fonte..."
                                    className="w-full rounded-xl bg-muted/30 border border-border/50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={toggleSelectAll}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                {selectedIds.size === filteredLeads.length && filteredLeads.length > 0
                                    ? "Desmarcar todos"
                                    : `Selecionar todos (${filteredLeads.length})`}
                            </button>
                        </div>

                        {/* Lead List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                    <p className="text-sm">Carregando leads...</p>
                                </div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <AlertTriangle className="w-8 h-8 mb-3 text-amber-500" />
                                    <p className="text-sm font-bold">Nenhum lead com e-mail encontrado.</p>
                                    <p className="text-xs mt-1 text-center max-w-[250px]">
                                        Use a Prospecção Inteligente para extrair e-mails automaticamente dos sites.
                                    </p>
                                </div>
                            ) : (
                                filteredLeads.map(lead => (
                                    <button
                                        key={lead.id}
                                        onClick={() => toggleSelect(lead.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                            selectedIds.has(lead.id)
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border/50 bg-background hover:bg-muted/30"
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                            selectedIds.has(lead.id)
                                                ? "border-primary bg-primary"
                                                : "border-muted-foreground/30"
                                        }`}>
                                            {selectedIds.has(lead.id) && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{lead.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                                        </div>

                                        {lead.source && (
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-muted/50 text-muted-foreground shrink-0">
                                                {lead.source}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
