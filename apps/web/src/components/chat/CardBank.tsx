"use client";

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Bot, Calendar, Clock, Pause, Zap, Plus, Tag as TagIcon, Star, Info, AlertCircle, Heart, BotOff, MoreVertical, Check, Trash2 } from 'lucide-react';
import CreateTagModal from './CreateTagModal';
import DeleteTagModal from '@/app/dashboard/chats/DeleteTagModal';

export type CardType = 'IA' | 'PARAR_IA' | 'AGENDADO' | 'AMANHA' | 'PAUSA_2H' | string;

const ICON_MAP: Record<string, React.ReactNode> = {
  Tag: <TagIcon size={12} />,
  Star: <Star size={12} />,
  Info: <Info size={12} />,
  AlertCircle: <AlertCircle size={12} />,
  Heart: <Heart size={12} />,
};

interface Props {
  type: CardType;
  label: string;
  icon: React.ReactNode;
  color: string;
  isCustom?: boolean;
  isActive?: boolean;
}

export function DraggableCard({ type, label, icon, color, isCustom, isActive }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${type}`,
    data: { type, isCustom, label }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  // Estilo customizado com vidro/glossy
  const customStyle = isCustom ? {
    backgroundColor: isActive ? `${color}40` : `${color}15`,
    color: color,
    borderColor: isActive ? color : `${color}30`,
    boxShadow: isDragging ? `0 0 20px ${color}40` : isActive ? `0 0 15px ${color}20` : `0 0 10px ${color}10`
  } : {};

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...customStyle }}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest
        cursor-grab active:cursor-grabbing select-none transition-all border backdrop-blur-sm relative group
        ${isDragging ? 'opacity-50 scale-105 rotate-2 shadow-2xl' : 'opacity-100 scale-100 hover:scale-105 active:scale-95 hover:shadow-lg'}
        ${!isCustom ? `${color} shadow-sm ${isActive ? 'ring-2 ring-forest-500/50' : ''}` : ''}
      `}
    >
      <div className={`${isDragging ? 'animate-bounce-subtle' : 'group-hover:scale-110 transition-transform'}`}>
        {icon}
      </div>
      {label}
      {isActive && (
        <div className="absolute -top-1 -right-1 bg-foreground text-background rounded-full p-0.5 shadow-lg border border-background animate-in zoom-in duration-300">
          <Check size={8} strokeWidth={4} />
        </div>
      )}
    </div>
  );
}

interface CardBankProps {
  customTags?: any[];
  activeLeadTagIds?: string[];
}

export default function CardBank({ customTags = [], activeLeadTagIds = [] }: CardBankProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 p-4 bg-[#111b21] border-b border-[#222d34] shadow-inner overflow-x-auto no-scrollbar">
      {/* Fixed Cards */}
      <DraggableCard 
        type="IA" 
        label="Ligar IA" 
        icon={<Zap size={12} className="fill-current" />} 
        color="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      />
      <DraggableCard 
        type="PARAR_IA" 
        label="Parar IA" 
        icon={<BotOff size={12} />} 
        color="bg-red-500/10 text-red-500 border-red-500/20"
      />
      <DraggableCard 
        type="AGENDADO" 
        label="Agendado" 
        icon={<Calendar size={12} />} 
        color="bg-blue-500/10 text-blue-500 border-blue-500/20"
      />
      <DraggableCard 
        type="AMANHA" 
        label="Amanhã" 
        icon={<Clock size={12} />} 
        color="bg-amber-500/10 text-amber-500 border-amber-500/20"
      />
      <DraggableCard 
        type="PAUSA_2H" 
        label="Pausa 2h" 
        icon={<Pause size={12} />} 
        color="bg-purple-500/10 text-purple-500 border-purple-500/20"
      />

      {/* Dynamic Custom Tags */}
      {customTags.map(tag => (
        <DraggableCard 
          key={tag.id}
          type={tag.id}
          label={tag.name}
          isCustom={true}
          isActive={activeLeadTagIds.includes(tag.id)}
          icon={ICON_MAP[tag.iconName] || <TagIcon size={12} />}
          color={tag.color}
        />
      ))}

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-2 border-l border-white/5 pl-2">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center p-2 rounded-xl bg-[#202c33] border border-[#222d34] text-[#8696a0] hover:text-[#e9edef] transition-all hover:scale-105 active:scale-95"
          title="Nova Etiqueta"
        >
          <Plus size={16} />
        </button>
        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm group"
          title="Excluir Etiquetas"
        >
          <Trash2 size={16} className="group-hover:animate-bounce-subtle" />
        </button>
      </div>

      <CreateTagModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <DeleteTagModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        tags={customTags.map(t => ({ ...t, type: t.id }))}
      />
    </div>
  );
}
