
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
    Plug
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectMetaAccount, toggleFormIntegration } from "./actions";
import { toast } from "sonner";

export default function IntegrationsPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [forms, setForms] = useState<any[]>([]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const res = await connectMetaAccount();
            if (res.success) {
                setIsConnected(true);
                setForms(res.forms.map((f: any) => ({ ...f, integrated: false, page: "Nacional Consórcios" })));
                toast.success("Conta Meta conectada com sucesso!");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao conectar conta");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleIntegration = async (formId: string, pageName: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;

        // Update UI immediately (optimistic)
        setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: nextStatus } : f));

        try {
            const res = await toggleFormIntegration(formId, pageName, nextStatus);
            if (res.success && nextStatus) {
                toast.success(res.message);
            } else if (res.success) {
                toast.info(res.message);
            }
        } catch (error: any) {
            // Rollback UI on error
            setForms(prev => prev.map(f => f.id === formId ? { ...f, integrated: currentStatus } : f));
            toast.error("Erro ao alterar integração");
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
                        {!isConnected ? (
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
                        ) : (
                            <>
                                {/* Account Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full border-4 border-white shadow-sm bg-zinc-200 overflow-hidden" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-zinc-400">Conta Conectada</p>
                                                <p className="text-sm font-black text-zinc-900">João Silva (Gestor)</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setIsConnected(false)}>Desconectar</Button>
                                    </div>
                                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-700">
                                        <CheckCircle2 size={24} />
                                        <div>
                                            <p className="text-[10px] font-black uppercase">Webhooks Ativos</p>
                                            <p className="text-sm font-black">Sincronização em tempo real</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Forms Management */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b pb-4 border-zinc-100">
                                        <div className="flex items-center gap-2">
                                            <LayoutGrid size={18} className="text-zinc-400" />
                                            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Gerenciar Formulários Meta</h3>
                                        </div>
                                        <Button variant="outline" size="sm" className="rounded-xl font-bold uppercase text-[9px] h-8 gap-2">
                                            <RefreshCw size={12} /> Atualizar Lista
                                        </Button>
                                    </div>

                                    <div className="divide-y divide-zinc-50">
                                        {forms.map((form) => (
                                            <div key={form.id} className="py-6 flex items-center justify-between hover:bg-zinc-50/50 transition-all px-4 rounded-2xl">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-black text-zinc-900">{form.name}</h4>
                                                        <Badge variant="outline" className={`text-[8px] font-black uppercase ${form.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                            {form.status === 'active' ? 'Publicado' : 'Draft'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                                        <span className="flex items-center gap-1"><Link2 size={10} /> {form.page}</span>
                                                        <span className="flex items-center gap-1">ID: {form.id}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Status CRM</p>
                                                        <span className={`text-[10px] font-black uppercase ${form.integrated ? "text-emerald-600" : "text-zinc-400"}`}>
                                                            {form.integrated ? "Integrado" : "Inativo"}
                                                        </span>
                                                    </div>
                                                    <Switch
                                                        checked={form.integrated}
                                                        onCheckedChange={() => handleToggleIntegration(form.id, form.page, form.integrated)}
                                                        className="data-[state=checked]:bg-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                                    <AlertCircle size={18} />
                                    <p className="text-xs font-medium leading-relaxed">
                                        <strong>Nota:</strong> Apenas os leads vindos de formulários com "Status CRM" <strong>Integrado</strong> serão processados pela nossa IA e adicionados automaticamente ao seu Kanban.
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
