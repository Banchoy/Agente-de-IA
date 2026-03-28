"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, MessageSquare, Loader2, Sparkles, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { processProspecting, getProspectingProgress } from "./leads/actions";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

import { Badge } from "@/components/ui/badge";

interface ProspectingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProspectingModal({ isOpen, onClose }: ProspectingModalProps) {
    const [url, setUrl] = useState("");
    const [niche, setNiche] = useState("");
    const [initialMessage, setInitialMessage] = useState("");
    const [minRating, setMinRating] = useState("4.0");
    const [minReviews, setMinReviews] = useState("10");
    const [maxItems, setMaxItems] = useState("50");
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados do Progresso
    const [view, setView] = useState<"form" | "progress">("form");
    const [runId, setRunId] = useState<string | null>(null);
    const [progressStatus, setProgressStatus] = useState("Iniciando...");
    const [foundLeads, setFoundLeads] = useState<{name: string, phone: string}[]>([]);
    const [percent, setPercent] = useState(5);

    // Polling Effect
    React.useEffect(() => {
        let interval: NodeJS.Timeout;

        if (view === "progress" && runId) {
            interval = setInterval(async () => {
                const res = await getProspectingProgress(runId, niche);
                if (res.success) {
                    setFoundLeads(res.leads || []);
                    setProgressStatus(res.status === "RUNNING" ? "Extraindo dados do Google Maps..." : "Finalizado!");
                    
                    if (res.status === "RUNNING") {
                        setPercent(prev => Math.min(prev + 2, 90)); // Simula progresso até chegar no fim
                    } else if (res.status === "SUCCEEDED") {
                        setPercent(100);
                        clearInterval(interval);
                        toast.success("Prospecção concluída com sucesso!");
                    } else if (res.status === "FAILED" || res.status === "ABORTED") {
                        setProgressStatus("Erro na extração.");
                        clearInterval(interval);
                    }
                }
            }, 5000);
        }

        return () => clearInterval(interval);
    }, [view, runId]);

    const handleStart = async () => {
        if (!url) {
            toast.error("Por favor, insira uma URL do Google Maps.");
            return;
        }

        try {
            setIsLoading(true);
            const res = await processProspecting(url, { 
                niche, 
                initialMessage,
                minRating,
                minReviews,
                maxItems
            });
            
            if (res.success && res.runId) {
                setRunId(res.runId);
                setView("progress");
            } else {
                toast.error(res.error || "Erro ao iniciar prospecção.");
            }
        } catch (error) {
            toast.error("Erro técnico ao iniciar prospecção.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinished = () => {
        onClose();
        window.location.reload(); // Refresh total para ver os leads no Kanban
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-border rounded-3xl bg-card shadow-2xl overflow-hidden p-0">
                {view === "form" ? (
                    <>
                        <div className="p-6">
                            <DialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl">
                                        <Bot className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-black tracking-tight">Prospecção Inteligente</DialogTitle>
                                        <DialogDescription className="text-sm">
                                            Extraia leads qualificados do Google Maps automaticamente.
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="grid gap-6 py-6">
                                <div className="space-y-2">
                                    <Label htmlFor="url" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-primary" /> Link do Google Maps
                                    </Label>
                                    <Input
                                        id="url"
                                        placeholder="Cole o link da busca (ex: dentistas em curitiba)"
                                        className="rounded-2xl bg-muted/30 border-border/50 focus:ring-primary h-12 text-sm"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="niche" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Nicho</Label>
                                        <Input
                                            id="niche"
                                            placeholder="Ex: Imobiliária"
                                            className="rounded-2xl bg-muted/30 border-border/50 focus:ring-primary h-12"
                                            value={niche}
                                            onChange={(e) => setNiche(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="maxItems" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Máx. Leads</Label>
                                        <Input
                                            id="maxItems"
                                            type="number"
                                            className="rounded-2xl bg-muted/30 border-border/50 focus:ring-primary h-12"
                                            value={maxItems}
                                            onChange={(e) => setMaxItems(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-y border-border/30 py-4 my-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="minRating" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                            ⭐ Nota Mínima
                                        </Label>
                                        <Input
                                            id="minRating"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            className="rounded-2xl bg-muted/30 border-border/50 focus:ring-primary h-12"
                                            value={minRating}
                                            onChange={(e) => setMinRating(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="minReviews" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                            💬 Mín. Avaliações
                                        </Label>
                                        <Input
                                            id="minReviews"
                                            type="number"
                                            className="rounded-2xl bg-muted/30 border-border/50 focus:ring-primary h-12"
                                            value={minReviews}
                                            onChange={(e) => setMinReviews(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
                                        <MessageSquare className="w-3 h-3 text-primary" /> Mensagem Inicial (Opcional)
                                    </Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Seja direto e persuasivo... Use {nome} para personalizar."
                                        className="rounded-2xl bg-muted/30 border-border/50 focus:ring-primary min-h-[100px] resize-none text-sm p-4"
                                        value={initialMessage}
                                        onChange={(e) => setInitialMessage(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-muted/20 border-t border-border/50 flex gap-3">
                            <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-2xl font-bold px-6">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleStart} 
                                disabled={isLoading}
                                className="bg-primary text-primary-foreground rounded-2xl flex-1 hover:opacity-90 gap-2 h-12 font-black shadow-xl shadow-primary/20 transition-all active:scale-95"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Iniciando Robôs...
                                    </>
                                ) : (
                                    <>
                                        <Bot className="w-5 h-5" />
                                        Iniciar Prospecção
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="p-8 flex flex-col items-center text-center space-y-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative h-20 w-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl">
                                {percent < 100 ? (
                                    <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 w-full">
                            <h3 className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
                                {percent < 100 ? "Prospecção em Andamento" : "Trabalho Concluído!"}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 font-medium">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                {progressStatus}
                            </p>
                        </div>

                        <div className="w-full space-y-4 bg-muted/20 p-6 rounded-3xl border border-border/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progresso Global</span>
                                <span className="text-sm font-black text-primary">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-3 rounded-full bg-muted shadow-inner" />
                            
                            <div className="pt-4 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                                    <Users className="w-3 h-3" /> Leads Encontrados
                                </div>
                                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    {foundLeads.length > 0 ? foundLeads.map((l, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-background rounded-2xl border border-border/50 animate-in slide-in-from-bottom duration-500">
                                            <div className="text-left">
                                                <p className="font-bold text-xs truncate max-w-[150px]">{l.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{l.phone}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-50 font-black">
                                                SALVO
                                            </Badge>
                                        </div>
                                    )) : (
                                        <div className="py-8 text-center text-xs text-muted-foreground/60 italic">
                                            O robô está revirando o Maps... <br/>os leads já vão aparecer aqui.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleFinished} 
                            disabled={percent < 5}
                            className="w-full bg-primary text-primary-foreground rounded-2xl h-14 font-black text-lg hover:opacity-90 shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                        >
                            {percent < 100 ? "Acompanhar no CRM" : "Ver Todos no CRM"}
                        </Button>
                        <p className="text-[10px] text-muted-foreground">
                            Você pode fechar esta tela sem problemas. <br/>A extração continuará rodando em segundo plano.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
