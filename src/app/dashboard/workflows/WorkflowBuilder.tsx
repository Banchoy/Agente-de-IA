"use client";

import React, { useCallback, useMemo, useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Plus, Play, ArrowLeft, Bot, Globe, FileText } from 'lucide-react';
import Link from 'next/link';
import { updateWorkflowConfig } from './actions';

const nodeTypes = {}; // We can add custom node types here later

export default function WorkflowBuilder({ workflow }: { workflow: any }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(
        workflow.nodes || []
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(
        workflow.edges || []
    );
    const [isSaving, setIsSaving] = useState(false);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateWorkflowConfig(workflow.id, nodes, edges);
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const addNode = (type: string) => {
        const id = `${type}_${Date.now()}`;
        const newNode = {
            id,
            type: type === 'agent' ? 'default' : 'default', // Using default for now
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: {
                label: type === 'agent' ? '🤖 Novo Agente' :
                    type === 'maps' ? '📍 Maps Scraper' : '📄 Extrator'
            },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 font-sans">
            {/* Editor Header */}
            <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/workflows"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h2 className="text-sm font-bold text-zinc-900">{workflow.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${workflow.status === 'active' ? 'bg-green-500' : 'bg-zinc-300'}`} />
                            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                                {workflow.status === 'active' ? 'Ativo' : 'Rascunho'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 transition-all active:scale-95"
                    >
                        <Play size={14} />
                        Testar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        ) : <Save size={14} />}
                        {isSaving ? "Salvando..." : "Salvar Fluxo"}
                    </button>
                </div>
            </header>

            {/* Main Canvas Area */}
            <div className="flex-1 relative bg-zinc-50">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    colorMode="light"
                >
                    <Controls />
                    <MiniMap />
                    <Background color="#e2e8f0" variant={"dots" as any} gap={20} />

                    <Panel position="top-right" className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-xl space-y-3 min-w-[200px]">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Biblioteca de Nós</p>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => addNode('agent')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 hover:text-white transition-all text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-100"
                            >
                                <Bot size={16} />
                                Novo Agente
                            </button>
                            <button
                                onClick={() => addNode('maps')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 hover:text-white transition-all text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-100"
                            >
                                <Globe size={16} />
                                Maps Scraper
                            </button>
                            <button
                                onClick={() => addNode('extract')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 hover:text-white transition-all text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-100"
                            >
                                <FileText size={16} />
                                Extrator de Dados
                            </button>
                        </div>
                    </Panel>
                </ReactFlow>
            </div>
        </div>
    );
}
