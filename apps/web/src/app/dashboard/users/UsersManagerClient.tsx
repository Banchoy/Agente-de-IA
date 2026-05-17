"use client";

import React, { useState } from "react";
import { Users, Mail, Shield, Calendar, Bot, Check, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateUserRole, updateRoutingConfig } from "./actions";
import { RoutingConfig } from "@/lib/services/routing";

export default function UsersManagerClient({
    members,
    orgId,
    initialRoutingConfig
}: {
    members: any[];
    orgId: string;
    initialRoutingConfig: any;
}) {
    const [config, setConfig] = useState<RoutingConfig>(
        initialRoutingConfig || { enabled: false, queues: {} }
    );
    const [isSaving, setIsSaving] = useState(false);

    // Garante que o default queue exista
    const queues = config.queues || {};
    const queueNames = Object.keys(queues);
    if (queueNames.length === 0) {
        queues["default"] = { users: [], lastAssignedIndex: 0 };
        config.queues = queues;
    }

    const handleRoleChange = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "admin" ? "vendedor" : "admin";
        toast.promise(updateUserRole(userId, newRole), {
            loading: "Atualizando papel...",
            success: "Papel atualizado com sucesso!",
            error: "Erro ao atualizar papel."
        });
    };

    const handleToggleRouting = async () => {
        const newConfig = { ...config, enabled: !config.enabled };
        setConfig(newConfig);
        await saveConfig(newConfig);
    };

    const handleAddQueue = () => {
        const name = prompt("Nome da Fila (Ex: imóvel, automóvel, default):");
        if (!name) return;
        
        const newConfig = { ...config };
        if (!newConfig.queues[name.toLowerCase()]) {
            newConfig.queues[name.toLowerCase()] = { users: [], lastAssignedIndex: 0 };
            setConfig(newConfig);
            saveConfig(newConfig);
        }
    };

    const handleToggleUserInQueue = (queueName: string, userId: string) => {
        const newConfig = { ...config };
        const queue = newConfig.queues[queueName];
        
        if (queue.users.includes(userId)) {
            queue.users = queue.users.filter(id => id !== userId);
        } else {
            queue.users.push(userId);
        }
        
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const handleDeleteQueue = (queueName: string) => {
        if (!confirm(`Remover a fila ${queueName}?`)) return;
        const newConfig = { ...config };
        delete newConfig.queues[queueName];
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const saveConfig = async (newConfig: RoutingConfig) => {
        setIsSaving(true);
        try {
            await updateRoutingConfig(orgId, newConfig);
            toast.success("Configurações da roleta salvas.");
        } catch (err) {
            toast.error("Erro ao salvar configurações.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Users size={18} className="text-zinc-500" /> Equipe e Permissões
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Papel</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Acesso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
                                                {member.clerkUserId.substring(5, 7).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900">ID: {member.clerkUserId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleRoleChange(member.id, member.role || "membro")}
                                            className={`h-7 px-3 text-[10px] font-bold uppercase rounded-full border ${member.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}
                                        >
                                            <Shield size={10} className="mr-1.5" />
                                            {member.role === 'admin' ? 'Administrador' : (member.role || 'Vendedor')}
                                        </Button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-600">
                                        {member.role === 'admin' ? 'Acesso Total' : 'Vê apenas seus leads designados'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Configurações da Roleta */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-emerald-50/30">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                            <Settings2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-zinc-900">Roleta de Leads (Round-Robin)</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Distribuição automática de leads entre vendedores.</p>
                        </div>
                    </div>
                    <Button 
                        variant={config.enabled ? "default" : "outline"}
                        className={config.enabled ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        onClick={handleToggleRouting}
                    >
                        {config.enabled ? "Roleta Ativada" : "Ativar Roleta"}
                    </Button>
                </div>

                {config.enabled && (
                    <div className="p-6 bg-zinc-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-sm text-zinc-700">Filas de Distribuição</h4>
                            <Button size="sm" variant="outline" onClick={handleAddQueue}>Nova Fila</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.keys(config.queues).map((queueName) => {
                                const queue = config.queues[queueName];
                                return (
                                    <div key={queueName} className="border border-zinc-200 bg-white rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="uppercase bg-zinc-100">{queueName}</Badge>
                                                <span className="text-xs text-zinc-500">{queue.users.length} membros</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleDeleteQueue(queueName)}>
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {members.map(member => {
                                                const isInQueue = queue.users.includes(member.id);
                                                return (
                                                    <div key={member.id} className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                                        <span className="text-xs font-medium text-zinc-700 truncate w-32">
                                                            User: {member.clerkUserId.substring(5, 7)}
                                                        </span>
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            className={`h-6 text-[10px] px-2 ${isInQueue ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'text-zinc-400'}`}
                                                            onClick={() => handleToggleUserInQueue(queueName, member.id)}
                                                        >
                                                            {isInQueue ? <><Check size={10} className="mr-1" /> Na Fila</> : "Adicionar"}
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
