"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Save, Bot, Globe, Database, Sparkles, Wand2, ArrowLeft, Loader2, Mail } from "lucide-react";
import { updateApiKeys, getApiKeys } from "./actions";
import { toast } from "sonner";
import Link from "next/link";

export default function ApiKeysPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [keys, setKeys] = useState({
        openaiApiKey: "",
        geminiApiKey: "",
        openrouterApiKey: "",
        apifyApiKey: "",
        elevenlabsApiKey: "",
        resendApiKey: "",
    });

    useEffect(() => {
        async function loadKeys() {
            try {
                const data = await getApiKeys();
                if (data) {
                    setKeys({
                        openaiApiKey: data.openaiApiKey || "",
                        geminiApiKey: data.geminiApiKey || "",
                        openrouterApiKey: data.openrouterApiKey || "",
                        apifyApiKey: data.apifyApiKey || "",
                        elevenlabsApiKey: data.elevenlabsApiKey || "",
                        resendApiKey: data.resendApiKey || "",
                    });
                }
            } catch (error) {
                toast.error("Erro ao carregar chaves");
            } finally {
                setLoading(false);
            }
        }
        loadKeys();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateApiKeys(keys);
            toast.success("Configurações salvas com sucesso!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar chaves");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <Link href="/dashboard/settings" className="flex items-center gap-2 text-[10px] font-black text-muted-foreground hover:text-primary transition-all uppercase tracking-widest mb-2 group">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Voltar para Configurações
                    </Link>
                    <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter leading-none">Chaves de API</h1>
                    <p className="text-muted-foreground font-medium">Configure suas credenciais para inteligência artificial e prospecção.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
                >
                    {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                    {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
            </div>

            <div className="grid gap-8">
                {/* AI Providers */}
                <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-card">
                    <CardHeader className="bg-zinc-900 text-white p-8">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
                                <Sparkles className="text-blue-400" size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight leading-tight">Provedores de IA</CardTitle>
                                <CardDescription className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Modelos de Linguagem & Agentes</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                    <Bot size={14} className="text-primary" /> OpenAI API Key
                                </Label>
                                <Input 
                                    type="password" 
                                    placeholder="sk-..." 
                                    value={keys.openaiApiKey}
                                    onChange={(e) => setKeys({...keys, openaiApiKey: e.target.value})}
                                    className="rounded-2xl border-border bg-muted/20 h-14 px-5 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                    <Sparkles size={14} className="text-primary" /> Google Gemini Key
                                </Label>
                                <Input 
                                    type="password" 
                                    placeholder="AIza..." 
                                    value={keys.geminiApiKey}
                                    onChange={(e) => setKeys({...keys, geminiApiKey: e.target.value})}
                                    className="rounded-2xl border-border bg-muted/20 h-14 px-5 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                    <Globe size={14} className="text-primary" /> OpenRouter API Key
                                </Label>
                                <Input 
                                    type="password" 
                                    placeholder="sk-or-v1-..." 
                                    value={keys.openrouterApiKey}
                                    onChange={(e) => setKeys({...keys, openrouterApiKey: e.target.value})}
                                    className="rounded-2xl border-border bg-muted/20 h-14 px-5 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                    <Wand2 size={14} className="text-primary" /> ElevenLabs API Key
                                </Label>
                                <Input 
                                    type="password" 
                                    placeholder="Chave para Vozes AI" 
                                    value={keys.elevenlabsApiKey}
                                    onChange={(e) => setKeys({...keys, elevenlabsApiKey: e.target.value})}
                                    className="rounded-2xl border-border bg-muted/20 h-14 px-5 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Scrapers & Tools */}
                <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-card">
                    <CardHeader className="bg-zinc-900 text-white p-8">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
                                <Database className="text-orange-400" size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight leading-tight">Ferramentas de Prospecção</CardTitle>
                                <CardDescription className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Apify & Google Leads</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                <Key size={14} className="text-primary" /> Apify API Token
                            </Label>
                            <Input 
                                type="password" 
                                placeholder="apify_api_..." 
                                value={keys.apifyApiKey}
                                onChange={(e) => setKeys({...keys, apifyApiKey: e.target.value})}
                                className="rounded-2xl border-border bg-muted/20 h-14 px-5 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground font-medium italic mt-2 px-1 opacity-70">
                                Necessário para rodar o crawler de Google Maps e gerar leads automaticamente em tempo real.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* E-mail Marketing */}
                <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-card">
                    <CardHeader className="bg-zinc-900 text-white p-8">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
                                <Mail className="text-blue-400" size={28} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight leading-tight">E-mail Marketing</CardTitle>
                                <CardDescription className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Disparo em Massa via Resend</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                <Mail size={14} className="text-primary" /> Resend API Key
                            </Label>
                            <Input 
                                type="password" 
                                placeholder="re_..." 
                                value={keys.resendApiKey}
                                onChange={(e) => setKeys({...keys, resendApiKey: e.target.value})}
                                className="rounded-2xl border-border bg-muted/20 h-14 px-5 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground font-medium italic mt-2 px-1 opacity-70">
                                Necessária para realizar envios de e-mails em massa personalizados de forma direta para seus leads.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[32px] flex flex-col md:flex-row gap-6 items-center text-blue-600 dark:text-blue-400">
                    <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <Bot size={32} />
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="font-black uppercase tracking-tighter text-lg">Segurança & Privacidade</h4>
                        <p className="text-xs font-medium leading-relaxed opacity-80">
                            Suas chaves de API são armazenadas com criptografia em nível de banco de dados e utilizadas apenas para processar as requisições da sua organização. 
                            Se você deixar um campo vazio, o sistema tentará usar a chave padrão configurada globalmente pelo administrador.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
