"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MapPin, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { processProspecting } from "./leads/actions";
import { toast } from "sonner";

interface ProspectingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProspectingModal({ isOpen, onClose }: ProspectingModalProps) {
    const [url, setUrl] = useState("");
    const [niche, setNiche] = useState("");
    const [initialMessage, setInitialMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleStart = async () => {
        if (!url) {
            toast.error("Por favor, insira uma URL do Google Maps.");
            return;
        }

        try {
            setIsLoading(true);
            const res = await processProspecting(url, { niche, initialMessage });
            
            if (res.success) {
                toast.success(`Sucesso! ${res.count} leads foram extraídos e adicionados à Qualificação.`);
                onClose();
                window.location.reload(); // Atualiza para mostrar os novos leads
            } else {
                toast.error(res.error || "Erro ao processar prospecção.");
            }
        } catch (error) {
            toast.error("Erro técnico ao iniciar prospecção.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-border rounded-2xl bg-card shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Bot className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black">Prospecção com IA</DialogTitle>
                            <DialogDescription>
                                Extraia leads automaticamente do Google Maps e inicie o contato.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Link do Google Maps
                        </Label>
                        <Input
                            id="url"
                            placeholder="Pinte ou cole o link da busca (ex: imobiliárias em SP)"
                            className="rounded-xl bg-background border-border focus:ring-2 focus:ring-primary h-11"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="niche" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nicho / Setor</Label>
                            <Input
                                id="niche"
                                placeholder="Ex: Imobiliária"
                                className="rounded-xl bg-background border-border focus:ring-2 focus:ring-primary h-11"
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                            <div className="p-3 bg-accent/30 rounded-xl text-[10px] text-muted-foreground leading-relaxed flex items-start gap-2">
                                <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                <span>A IA buscará telefones e sites para encontrar o WhatsApp.</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Mensagem Inicial (Opcional)
                        </Label>
                        <Textarea
                            id="message"
                            placeholder="Personalize o primeiro contato... (Se vazio, usará o padrão)"
                            className="rounded-xl bg-background border-border focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                            value={initialMessage}
                            onChange={(e) => setInitialMessage(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground italic px-1">
                            Use {'{nome}'} e {'{nicho}'} para personalização dinâmica.
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl hover:bg-accent">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleStart} 
                        disabled={isLoading}
                        className="bg-primary text-primary-foreground rounded-xl flex-1 hover:opacity-90 gap-2 h-11 font-bold shadow-lg shadow-primary/20"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processando Leads...
                            </>
                        ) : (
                            <>
                                <Bot className="w-4 h-4" />
                                Iniciar Prospecção Agora
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
