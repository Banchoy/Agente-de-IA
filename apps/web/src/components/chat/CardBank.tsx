"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Bot, Calendar, Clock, Pause, Zap } from 'lucide-react';

export type CardType = 'IA' | 'AGENDADO' | 'AMANHA' | 'PAUSA_2H';

interface Props {
  type: CardType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export function DraggableCard({ type, label, icon, color }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${type}`,
    data: { type }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider
        cursor-grab active:cursor-grabbing select-none transition-all border shadow-sm
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100 hover:scale-105 active:scale-95'}
        ${color}
      `}
    >
      {icon}
      {label}
    </div>
  );
}

export default function CardBank() {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-card/50 backdrop-blur-md border-b border-border shadow-inner overflow-x-auto no-scrollbar">
      <DraggableCard 
        type="IA" 
        label="Ligar IA" 
        icon={<Zap size={12} className="fill-current" />} 
        color="bg-primary/20 text-primary border-primary/30"
      />
      <DraggableCard 
        type="AGENDADO" 
        label="Agendado" 
        icon={<Calendar size={12} />} 
        color="bg-blue-500/20 text-blue-500 border-blue-500/30"
      />
      <DraggableCard 
        type="AMANHA" 
        label="Amanhã" 
        icon={<Clock size={12} />} 
        color="bg-amber-500/20 text-amber-500 border-amber-500/30"
      />
      <DraggableCard 
        type="PAUSA_2H" 
        label="Pausa 2h" 
        icon={<Pause size={12} />} 
        color="bg-purple-500/20 text-purple-500 border-purple-500/30"
      />
    </div>
  );
}
