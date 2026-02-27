
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Facebook,
    Settings,
    Link2,
    CheckCircle2,
    AlertCircle,
    LayoutGrid,
    RefreshCw,
    Plug,
    ChevronLeft
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectMetaAccount, toggleFormIntegration, getFormsForPage } from "./actions";
import { toast } from "sonner";

export default function IntegrationsPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"connect" | "select-page" | "manage-forms">("connect");
    const [pages, setPages] = useState<any[]>([]);
    const [selectedPage, setSelectedPage] = useState<any>(null);
    const [forms, setForms] = useState<any[]>([]);

    const handleConnect = async () => {
        setIsLoading(true);

        // Simular abertura de Janela de OAuth do Facebook
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            "about:blank",
            "FacebookLogin",
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (popup) {
            popup.document.write(`
                <html>
                    <head>
                        <title>Fazer login no Facebook</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                        </style>
                    </head>
                    <body class="bg-[#f0f2f5] flex items-center justify-center h-screen overflow-hidden">
                        <div class="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                            <div class="flex justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </div>
                            <div class="space-y-2">
                                <h1 class="text-xl font-bold text-gray-900">LeadDirector AI</h1>
                                <p class="text-sm text-gray-500">Solicitando acesso para gerenciar seus formulários e anúncios.</p>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-lg flex items-center gap-3 text-left">
                                <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div>
                                    <p class="text-sm font-semibold">Continuar como Usuário</p>
                                    <p class="text-xs text-gray-400">joao.silva@exemplo.com</p>
                                </div>
                            </div>
                            <button onclick="window.close()" class="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-2.5 rounded-lg font-bold transition-colors">
                                Continuar como João
                            </button>
                            <p class="text-[10px] text-gray-400">O LeadDirector AI não poderá publicar fotos no seu perfil.</p>
                        </div>
                    </body>
                </html>
            `);

            const checkClosed = setInterval(async () => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    try {
                        const res = await connectMetaAccount();
                        if (res.success) {
                            setIsConnected(true);
                            setPages(res.pages);
                            setStep("select-page");
                            toast.success("Conta Meta conectada com sucesso!");
                        }
                    } catch (error: any) {
                        toast.error(error.message || "Erro ao conectar conta");
                    } finally {
                        setIsLoading(false);
                    }
                }
            }, 500);
        } else {
            toast.error("O bloqueador de popups impediu a janela de login.");
            setIsLoading(false);
        }
    };

    const handleSelectPage = async (page: any) => {
        setIsLoading(true);
        setSelectedPage(page);
        try {
            const res = await getFormsForPage(page.id);
            if (res.success) {
                setForms(res.forms.map((f: any) => ({ ...f, integrated: false, page: page.name })));
                setStep("manage-forms");
            }
        } catch (error: any) {
            toast.error("Erro ao buscar formulários.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleIntegration = async (formId: string, pageName: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;
        setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: nextStatus } : f));

        try {
            const res = await toggleFormIntegration(formId, pageName, nextStatus);
            if (res.success && nextStatus) {
                toast.success(res.message);
            } else if (res.success) {
                toast.info(res.message);
            }
        } catch (error: any) {
            setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: currentStatus } : f));
            toast.error("Erro ao alterar integração");
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setStep("connect");
        setPages([]);
        setSelectedPage(null);
        setForms([]);
        toast.info("Conta Meta desconectada.");
    };

    const handleRefreshForms = async () => {
        if (!selectedPage) return;
        setIsLoading(true);
        try {
            const res = await getFormsForPage(selectedPage.id);
            if (res.success) {
                setForms(res.forms.map((f: any) => ({ ...f, integrated: false, page: selectedPage.name })));
                toast.success("Lista de formulários atualizada!");
            }
        } catch (error: any) {
            toast.error("Erro ao atualizar formulários.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tighter">Integrações</h1>
                <p className="text-zinc-500 font-medium">Conecte suas fontes de leads e centralize sua operação.</p>
            </div>

            <div className="grid gap-8">
                {/* Meta Ads Card */}
                <Card className="border-zinc-200 shadow-xl rounded-3xl overflow-hidden border-none bg-white">
                    <CardHeader className="bg-zinc-900 text-white p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center">
                                    <Facebook className="text-[#1877F2]" size={32} />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Meta Ads (Facebook/Instagram)</CardTitle>
                                    <CardDescription className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1">Lead Forms Nativos</CardDescription>
                                </div>
                            </div>
                            <Badge className={`rounded-full px-4 h-8 ${isConnected ? 'bg-emerald-500' : 'bg-zinc-700'} border-none uppercase font-black text-[10px]`}>
                                {isConnected ? "Conectado" : "Desconectado"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {step === "connect" && (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                                <div className="p-6 bg-zinc-50 rounded-full">
                                    <Plug size={48} className="text-zinc-300" />
                                </div>
                                <div className="max-w-md space-y-2">
                                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Conecte sua conta empresarial</h3>
                                    <p className="text-zinc-500 font-medium">Ao conectar, o LeadDirector terá permissão para monitorar seus formulários e injetar novos leads automaticamente no seu CRM.</p>
                                </div>
                                <Button
                                    onClick={handleConnect}
                                    disabled={isLoading}
                                    className="bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    {isLoading ? <RefreshCw className="animate-spin mr-2" /> : <Facebook className="mr-2" />}
                                    Conectar via Facebook
                                </Button>
                            </div>
                        )}

                        {step === "select-page" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Selecione a Empresa / Página</h3>
                                        <p className="text-sm text-zinc-500 font-medium">Escolha qual ativo você deseja integrar ao CRM.</p>
                                    </div>
                                    <Button variant="ghost" onClick={handleDisconnect} className="text-[10px] font-bold uppercase text-red-500 hover:text-red-600">Sair</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pages.map((page) => (
                                        <button
                                            key={page.id}
                                            onClick={() => handleSelectPage(page)}
                                            disabled={isLoading}
                                            className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center gap-4 hover:border-[#1877F2] hover:bg-white transition-all text-left group"
                                        >
                                            <div className="h-12 w-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center overflow-hidden">
                                                <img src={page.image} alt={page.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-zinc-900 group-hover:text-[#1877F2] transition-colors">{page.name}</p>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{page.category}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === "manage-forms" && (
                            <>
                                {/* Account Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl border-4 border-white shadow-sm overflow-hidden bg-white">
                                                <img src={selectedPage?.image} alt={selectedPage?.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-zinc-400 leading-tight">Empresa Selecionada</p>
                                                <p className="text-sm font-black text-zinc-900">{selectedPage?.name}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-zinc-500 hover:text-zinc-900 gap-1" onClick={() => setStep("select-page")}>
                                            <ChevronLeft size={12} /> Alterar
                                        </Button>
                                    </div>
                                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-700">
                                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase leading-tight">Status Sincronização</p>
                                            <p className="text-sm font-black">Webhook Ativo em Tempo Real</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Forms Management */}
                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between border-b pb-4 border-zinc-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                                                <LayoutGrid size={16} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Formulários da {selectedPage?.name}</h3>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl font-bold uppercase text-[9px] h-8 gap-2 border-zinc-200"
                                            onClick={handleRefreshForms}
                                            disabled={isLoading}
                                        >
                                            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Atualizar Lista
                                        </Button>
                                    </div>

                                    <div className="divide-y divide-zinc-50">
                                        {forms.length > 0 ? (
                                            forms.map((form) => (
                                                <div key={form.id} className="py-6 flex items-center justify-between hover:bg-zinc-50/50 transition-all px-4 rounded-2xl group">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-black text-zinc-900">{form.name}</h4>
                                                            <Badge variant="outline" className={`text-[8px] font-black uppercase ${form.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                                {form.status === 'active' ? 'Publicado' : 'Draft'}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                                            <span className="flex items-center gap-1">ID: {form.id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Integrar CRM</p>
                                                            <span className={`text-[10px] font-black uppercase ${form.integrated ? "text-emerald-600" : "text-zinc-300"}`}>
                                                                {form.integrated ? "Ativado" : "Inativo"}
                                                            </span>
                                                        </div>
                                                        <Switch
                                                            checked={form.integrated}
                                                            onCheckedChange={() => handleToggleIntegration(form.id, form.page, form.integrated)}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center space-y-2 opacity-50">
                                                <p className="text-sm font-bold uppercase text-zinc-400">Nenhum formulário encontrado nesta página.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <div className="text-xs font-medium leading-tight">
                                        <strong>Dica:</strong> Ao ativar um formulário, todos os leads históricos dos últimos 90 dias serão importados automaticamente para a primeira etapa do seu Funil de Vendas.
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
