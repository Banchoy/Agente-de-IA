
"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LeadDetailsModalProps {
    lead: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (leadId: string, updatedData: any) => void;
}

export default function LeadDetailsModal({ lead, isOpen, onClose }: LeadDetailsModalProps) {
    if (!lead) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Teste de Estabilidade</DialogTitle>
                </DialogHeader>
                <div className="py-10 text-center space-y-4">
                    <p className="text-zinc-600">Se você está vendo isso, o modal carregou sem crashar.</p>
                    <div className="p-4 bg-zinc-100 rounded-2xl text-left text-xs font-mono">
                        <pre>{JSON.stringify({ id: lead.id, name: lead.name }, null, 2)}</pre>
                    </div>
                    <Button onClick={onClose} className="w-full bg-zinc-900 text-white rounded-xl">
                        Fechar Teste
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
