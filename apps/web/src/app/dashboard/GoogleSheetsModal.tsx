"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileSpreadsheet, RefreshCw, Save, Play, Database, Info, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { getGoogleSheetsConfig, saveGoogleSheetsConfig, syncGoogleSheetsNow } from "./integrations/actions";

interface GoogleSheetsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GoogleSheetsModal({ isOpen, onClose }: GoogleSheetsModalProps) {
    const [sheetsUrl, setSheetsUrl] = useState("");
    const [sheetsEnabled, setSheetsEnabled] = useState(true);
    const [sheetsLastSync, setSheetsLastSync] = useState<string | null>(null);
    const [sheetsError, setSheetsError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Carregar configurações da planilha
    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        try {
            const res = await getGoogleSheetsConfig();
            if (res.success) {
                setSheetsUrl(res.googleSheetsUrl);
                setSheetsEnabled(res.googleSheetsEnabled);
                setSheetsLastSync(res.googleSheetsLastSync);
                setSheetsError(res.googleSheetsError);
            }
        } catch (err) {
            console.error("Erro ao carregar configurações do Google Sheets:", err);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await saveGoogleSheetsConfig(sheetsUrl, sheetsEnabled);
            if (res.success) {
                toast.success(res.message);
                setSheetsError(null);
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar configurações.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSync = async () => {
        if (!sheetsUrl) {
            toast.error("Insira o link da planilha antes de sincronizar.");
            return;
        }
        setIsSyncing(true);
        try {
            const res = await syncGoogleSheetsNow();
            if (res.success) {
                toast.success(`Sucesso! ${res.importedCount} novos leads importados.`);
                setSheetsError(null);
                // Atualizar status local
                await loadConfig();
            } else {
                toast.error(res.error || "Erro ao sincronizar planilha.");
                setSheetsError(res.error || "Erro ao sincronizar.");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro técnico ao sincronizar.");
            setSheetsError(err.message || "Erro técnico.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] border-border rounded-3xl bg-card shadow-2xl overflow-hidden p-0">
                <div className="p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-600">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight">Planilha Google (Google Sheets)</DialogTitle>
                                <DialogDescription className="text-sm">
                                    Conecte e gerencie a importação automática de leads de planilhas.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-5 py-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="sheetsUrl" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                                    Link da Planilha Google
                                </Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-muted-foreground">Auto Sync (10m)</span>
                                    <Switch
                                        checked={sheetsEnabled}
                                        onCheckedChange={(checked) => setSheetsEnabled(checked)}
                                        className="data-[state=checked]:bg-emerald-500 scale-75"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input
                                        id="sheetsUrl"
                                        placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                                        className="rounded-2xl bg-muted/30 border-border/50 focus:ring-emerald-500 pl-11 h-12 text-sm"
                                        value={sheetsUrl}
                                        onChange={(e) => setSheetsUrl(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving || isSyncing}
                                    className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-2xl h-12 px-5 font-bold uppercase text-xs tracking-wider gap-2 shrink-0 transition-all active:scale-95"
                                >
                                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                                    Salvar
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center p-4 bg-muted/20 rounded-2xl border border-border/50">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <Database size={13} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground">Sincronização Sob Demanda</span>
                                </div>
                                {sheetsLastSync ? (
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                        Último sync: {new Date(sheetsLastSync).toLocaleString("pt-BR")}
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground font-medium">Nenhuma sincronização realizada ainda.</p>
                                )}
                                {sheetsError && (
                                    <p className="text-[10px] text-red-500 font-bold leading-tight">
                                        ⚠️ Erro: {sheetsError}
                                    </p>
                                )}
                            </div>
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing || !sheetsUrl}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-10 px-5 font-black uppercase text-[10px] tracking-widest gap-2 shrink-0 transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                            >
                                {isSyncing ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />}
                                Sincronizar Agora
                            </Button>
                        </div>

                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3 text-blue-600 dark:text-blue-400">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div className="text-[11px] space-y-1.5 leading-relaxed font-medium">
                                <p className="font-bold">⚠️ Compartilhamento Obrigatório:</p>
                                <p>A planilha precisa estar pública para acesso. Siga os passos:</p>
                                <ol className="list-decimal list-inside space-y-0.5">
                                    <li>Abra a planilha no Google Sheets.</li>
                                    <li>Clique em <strong>Compartilhar</strong> (canto superior direito).</li>
                                    <li>Mude o Acesso Geral para <strong>Qualquer pessoa com o link</strong> (Leitor ou Editor).</li>
                                    <li>Copie e cole o link no campo acima.</li>
                                </ol>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">
                                    Mapeamento automático: detectamos colunas de Nome, Telefone, WhatsApp, E-mail e Origem!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-muted/20 border-t border-border/50 flex gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSyncing} className="rounded-2xl font-bold px-6 w-full">
                        Fechar e Voltar ao CRM
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
