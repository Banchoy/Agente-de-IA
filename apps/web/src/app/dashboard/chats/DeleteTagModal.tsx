"use client";

import React, { useState } from "react";
import { X, Trash2, Tag as TagIcon, Loader2, AlertCircle } from "lucide-react";
import { deleteTags } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    tags: any[];
}

export default function DeleteTagModal({ isOpen, onClose, tags }: DeleteTagModalProps) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const toggleTag = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        
        setIsDeleting(true);
        try {
            await deleteTags(Array.from(selectedIds));
            toast.success("Etiquetas excluídas com sucesso!");
            router.refresh();
            onClose();
        } catch (error) {
            toast.error("Erro ao excluir etiquetas.");
        } finally {
            setIsDeleting(false);
        }
    };

    const customTags = tags.filter(t => !["IA", "PARAR_IA", "AGENDADO", "AMANHA", "PAUSA_2H"].includes(t.type));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#202c33] w-full max-w-md rounded-2xl border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#111b21]">
                    <div className="flex items-center gap-2 text-red-500">
                        <Trash2 size={18} />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Excluir Etiquetas</h2>
                    </div>
                    <button onClick={onClose} className="text-[#aebac1] hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                    {customTags.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                            <TagIcon size={40} className="mx-auto text-[#8696a0]/20" />
                            <p className="text-[#8696a0] text-sm italic">Nenhuma etiqueta customizada para excluir.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {customTags.map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                        selectedIds.has(tag.id)
                                            ? "bg-red-500/10 border-red-500/50 text-white"
                                            : "bg-[#111b21] border-white/5 text-[#d1d7db] hover:border-white/10"
                                    }`}
                                >
                                    <div 
                                        className="w-4 h-4 rounded-full flex items-center justify-center border border-white/10 shadow-inner"
                                        style={{ backgroundColor: tag.color }}
                                    >
                                        {selectedIds.has(tag.id) && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-lg" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold uppercase tracking-wide">{tag.name}</div>
                                        <div className="text-[10px] text-[#8696a0]">Clique para selecionar</div>
                                    </div>
                                    {selectedIds.has(tag.id) && <Trash2 size={14} className="text-red-500 animate-pulse" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedIds.size > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-500/80 leading-relaxed font-medium">
                                ATENÇÃO: Excluir estas etiquetas as removerá permanentemente de todos os leads associados. Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-[#111b21] border-t border-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#d1d7db] hover:bg-white/5 rounded-xl transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={selectedIds.size === 0 || isDeleting}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${
                            selectedIds.size > 0 && !isDeleting
                                ? "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                                : "bg-[#2a3942] text-[#8696a0] cursor-not-allowed"
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Excluindo...
                            </>
                        ) : (
                            <>
                                <Trash2 size={14} />
                                Excluir ({selectedIds.size})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
