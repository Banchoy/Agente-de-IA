"use client";

import React from 'react';
import { useDroppable } from "@dnd-kit/core";
import { ShieldCheck } from "lucide-react";

interface Props {
    msg: any;
    isMe: boolean;
    tags: any[];
}

export default function DroppableMessage({ msg, isMe, tags }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: `msg-${msg.id}`,
    });

    return (
        <div 
            ref={setNodeRef}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5 transition-all ${isOver ? 'scale-105' : ''}`}
        >
            <div 
                className={`
                    relative px-3 py-1.5 rounded-lg text-[13px] leading-[19px] shadow-sm max-w-[65%]
                    ${isMe 
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}
                    ${isOver ? 'ring-2 ring-[#00a884] ring-inset' : ''}
                `}
            >
                {/* Tags Indicators */}
                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                        {tags.map((tag: any) => (
                            <div 
                                key={tag.id} 
                                title={tag.name}
                                className="w-2 h-2 rounded-full shadow-sm border border-white/10"
                                style={{ backgroundColor: tag.color }}
                            />
                        ))}
                    </div>
                )}
                {/* Tail */}
                <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2 bg-[#005c4b]' : '-left-2 bg-[#202c33]'}`} 
                     style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }} />
                
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px] text-[#8696a0] uppercase">
                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {isMe && <ShieldCheck size={10} className="text-[#53bdeb]" />}
                </div>
            </div>
        </div>
    );
}
