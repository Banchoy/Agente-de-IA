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
import { Save, Plus, Play, ArrowLeft, Bot, Globe, FileText, Settings, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { updateWorkflowConfig } from './actions';
import CustomNode from './CustomNode';

const nodeTypes = {
    custom: CustomNode,
};

export default function WorkflowBuilder({ workflow }: { workflow: any }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(workflow.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges || []);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
        [setEdges],
    );

    const onNodeClick = useCallback((_: any, node: any) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

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
            type: 'custom',
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: {
                icon: type,
                typeLabel: type === 'agent' ? 'Agente IA' : type === 'maps' ? 'Scraper' : 'Filtro',
                label: type === 'agent' ? 'Novo Agente' : type === 'maps' ? 'Maps Scraper' : 'Atende Critério',
                config: {}
            },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const deleteNode = useCallback((id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setSelectedNode(null);
    }, [setNodes, setEdges]);

    const updateNodeData = (id: string, newData: any) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === id) {
                    return { ...n, data: { ...n.data, ...newData } };
                }
                return n;
            })
        );
        // Sync selected node state
        if (selectedNode?.id === id) {
            setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, ...newData } }));
        }
    };

    return (
        <div className="flex flex-col h-full bg-background font-sans overflow-hidden">
            {/* Editor Header */}
            <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-md px-6 z-10">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/workflows"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all active:scale-95"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h2 className="text-sm font-bold text-foreground">{workflow.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${workflow.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {workflow.status === 'active' ? 'Ativo' : 'Rascunho'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-foreground hover:bg-accent/80 transition-all active:scale-95">
                        <Play size={14} className="text-green-500 fill-green-500" />
                        Simular
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : <Save size={14} />}
                        {isSaving ? "Salvando..." : "Publicar"}
                    </button>
                </div>
            </header>

            {/* Editor Body */}
            <div className="flex-1 flex relative overflow-hidden">
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        colorMode="system"
                    >
                        <Controls className="!bg-card !border-border !shadow-2xl" />
                        <Background color="var(--border)" variant={"dots" as any} gap={24} size={1} />

                        {/* Node Library Panel */}
                        <Panel position="top-left" className="bg-card/80 backdrop-blur-xl p-4 rounded-3xl border border-border shadow-2xl space-y-4 min-w-[220px]">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 px-1">Biblioteca</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => addNode('agent')}
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold text-foreground bg-accent/50 border border-transparent"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center">
                                            <Bot size={18} />
                                        </div>
                                        Novo Agente
                                    </button>
                                    <button
                                        onClick={() => addNode('maps')}
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold text-foreground bg-accent/50 border border-transparent"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center">
                                            <Globe size={18} />
                                        </div>
                                        Data Scraper
                                    </button>
                                    <button
                                        onClick={() => addNode('extract')}
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold text-foreground bg-accent/50 border border-transparent"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center">
                                            <FileText size={18} />
                                        </div>
                                        Filtro Lógico
                                    </button>
                                </div>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Settings Sidebar */}
                {selectedNode && (
                    <div className="w-[320px] border-l border-border bg-card/50 backdrop-blur-3xl p-6 shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                                <Settings size={20} className="text-primary" />
                                Ajustes
                            </h3>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Nome da Etapa</label>
                                <input
                                    value={selectedNode.data.label}
                                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">ID do Nó</label>
                                <div className="rounded-xl bg-accent px-4 py-2 text-[10px] font-mono text-muted-foreground">
                                    {selectedNode.id}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <button
                                    onClick={() => deleteNode(selectedNode.id)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-bold text-destructive hover:bg-destructive hover:text-white transition-all"
                                >
                                    <X size={16} />
                                    Excluir Bloco
                                </button>
                            </div>
                        </div>

                        <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/10 p-4">
                            <p className="text-[11px] text-primary font-medium leading-relaxed">
                                💡 Conecte este bloco a outro para definir a sequência da automação.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

    );
}
