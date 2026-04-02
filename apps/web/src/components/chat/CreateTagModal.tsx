"use client";

import React, { useState } from 'react';
import { X, Check, Tag as TagIcon, Palette, Star, Info, AlertCircle, Heart } from 'lucide-react';
import { createTag } from '@/app/dashboard/chats/actions';

const PRESET_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"
];

const PRESET_ICONS = [
    { name: "Tag", icon: <TagIcon size={16} /> },
    { name: "Star", icon: <Star size={16} /> },
    { name: "Info", icon: <Info size={16} /> },
    { name: "AlertCircle", icon: <AlertCircle size={16} /> },
    { name: "Heart", icon: <Heart size={16} /> },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateTagModal({ isOpen, onClose }: Props) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [iconName, setIconName] = useState("Tag");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await createTag({ name, color, iconName });
            onClose();
            setName("");
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#111b21] border border-[#222d34] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34]">
                    <h3 className="text-[#e9edef] font-semibold">Nova Etiqueta</h3>
                    <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Nome */}
                    <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-bold">Nome da Etiqueta</label>
                        <input 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Cliente VIP, Duvida, Urgente..."
                            className="w-full bg-[#2a3942] border-none rounded-xl px-4 py-3 text-[#d1d7db] placeholder-[#8696a0] focus:ring-2 focus:ring-[#00a884] transition-all"
                        />
                    </div>

                    {/* Cores */}
                    <div className="space-y-3">
                        <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-bold flex items-center gap-2">
                            <Palette size={12} /> Cor da Etiqueta
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all scale-100 hover:scale-110 ${color === c ? 'border-white' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Ícones */}
                    <div className="space-y-3">
                        <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-bold">Ícone</label>
                        <div className="flex flex-wrap gap-3">
                            {PRESET_ICONS.map(i => (
                                <button 
                                    key={i.name}
                                    onClick={() => setIconName(i.name)}
                                    className={`
                                        p-3 rounded-xl border transition-all flex items-center justify-center
                                        ${iconName === i.name 
                                            ? 'bg-[#00a884]/20 border-[#00a884] text-[#00a884]' 
                                            : 'bg-[#2a3942] border-[#222d34] text-[#8696a0] hover:bg-[#3b4a54]'}
                                    `}
                                >
                                    {i.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="pt-4 border-t border-[#222d34]">
                        <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-bold mb-3 block">Prévia</label>
                        <div 
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ backgroundColor: `${color}33`, color: color, border: `1px solid ${color}44` }}
                        >
                            {PRESET_ICONS.find(i => i.name === iconName)?.icon}
                            {name || "Minha Tag"}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#202c33] flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 text-sm text-[#8696a0] hover:text-[#e9edef] transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="bg-[#00a884] hover:bg-[#06cf9c] disabled:opacity-50 disabled:cursor-not-allowed text-[#111b21] px-8 py-2 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2"
                    >
                        {loading ? 'Criando...' : <><Check size={16} /> Criar Etiqueta</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
