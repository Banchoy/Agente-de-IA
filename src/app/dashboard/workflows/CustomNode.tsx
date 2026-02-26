"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, Globe, FileText, X, Settings } from 'lucide-react';

const CustomNode = ({ data, selected }: NodeProps) => {
    const Icon = data.icon === 'agent' ? Bot : data.icon === 'maps' ? Globe : FileText;

    return (
        <div className={`relative min-w-[180px] rounded-2xl border-2 bg-card p-4 transition-all shadow-lg ${selected ? 'border-primary ring-4 ring-primary/10' : 'border-border hover:border-muted-foreground/30'
            }`}>
            {/* Node Content */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
                    <Icon size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                        {String(data.typeLabel || 'Ação')}
                    </p>
                    <h4 className="text-sm font-bold text-foreground truncate">{String(data.label)}</h4>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="h-3 w-3 !bg-primary border-4 border-card !-top-1.5"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="h-3 w-3 !bg-primary border-4 border-card !-bottom-1.5"
            />

            {/* Delete and Settings indicator if selected */}
            {selected && (
                <div className="absolute -top-3 -right-3 flex gap-1 animate-in fade-in zoom-in-50 duration-200">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border text-foreground shadow-xl">
                        <Settings size={14} className="animate-spin-slow" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(CustomNode);
