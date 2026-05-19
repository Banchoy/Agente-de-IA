"use client";

import { useState } from "react";
import { 
    Search, 
    Smartphone, 
    Users, 
    Layers, 
    AlertTriangle, 
    CheckCircle,
    Calendar,
    ArrowUpRight,
    TrendingUp,
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrgMetric {
    id: string;
    name: string;
    evolutionInstanceStatus: string;
    subscriptionStatus: string;
    createdAt: string;
    leadCount: number;
    userCount: number;
    activeLeads: number;
}

export default function MasterPanelClient({ initialOrgs }: { initialOrgs: OrgMetric[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [orgs, setOrgs] = useState<OrgMetric[]>(initialOrgs);

    // Filtrar organizações baseado na busca
    const filteredOrgs = orgs.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calcular métricas agregadas
    const totalOrgs = orgs.length;
    const connectedCount = orgs.filter(o => o.evolutionInstanceStatus === "connected").length;
    const disconnectedOrgs = orgs.filter(o => o.evolutionInstanceStatus !== "connected");
    const disconnectedCount = disconnectedOrgs.length;
    const totalLeads = orgs.reduce((sum, o) => sum + o.leadCount, 0);

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }).format(new Date(dateStr));
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Seção de Métricas Globais (KPI Cards) */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total de Empresas</span>
                        <Layers className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{totalOrgs}</h3>
                        <p className="text-xs text-zinc-400 mt-1">Clientes cadastrados na base</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Conectados</span>
                        <Smartphone className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-emerald-600">{connectedCount}</h3>
                        <p className="text-xs text-emerald-500/80 mt-1">Sessões ativas no momento</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Desconectados</span>
                        <Smartphone className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-red-600">{disconnectedCount}</h3>
                        <p className="text-xs text-red-500/80 mt-1">Instâncias com sinal perdido</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total de Leads</span>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-extrabold text-blue-600">{totalLeads}</h3>
                        <p className="text-xs text-blue-500/80 mt-1">Leads processados no CRM</p>
                    </div>
                </div>
            </div>

            {/* Painel de Alerta de Conexões Caídas */}
            {disconnectedCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 dark:bg-red-950/20 dark:border-red-900/30 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
                        <ShieldAlert className="h-6 w-6 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-red-800 dark:text-red-300 text-sm">Alerta: Conexões Inativas Detectadas</h4>
                        <p className="text-xs text-red-700/80 dark:text-red-400/80">
                            As seguintes empresas estão com a conexão do WhatsApp inoperante e precisam de reconexão:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {disconnectedOrgs.map(org => (
                                <span 
                                    key={org.id} 
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/60 dark:text-red-200 dark:border-red-800"
                                >
                                    {org.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de Ações e Busca */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Buscar empresa por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-transparent dark:border-zinc-800 dark:bg-zinc-950"
                    />
                </div>
            </div>

            {/* Lista Grid das Empresas */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrgs.map((org) => {
                    const isConnected = org.evolutionInstanceStatus === "connected";
                    const activeRatio = org.leadCount > 0 ? (org.activeLeads / org.leadCount) * 100 : 0;

                    return (
                        <div 
                            key={org.id} 
                            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between relative overflow-hidden"
                        >
                            {/* Tarjeta de Plano */}
                            <div className="absolute top-0 right-0 left-0 h-1.5 bg-zinc-100 dark:bg-zinc-800" />
                            {org.subscriptionStatus === "active" ? (
                                <div className="absolute top-4 right-4 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                    Ativo
                                </div>
                            ) : (
                                <div className="absolute top-4 right-4 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                    Trial / Demo
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-extrabold text-zinc-950 dark:text-zinc-50 text-base pr-20 truncate">
                                        {org.name}
                                    </h4>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                                        ID: {org.id.slice(0, 8)}...
                                    </span>
                                </div>

                                {/* Status Conexão */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        {isConnected ? (
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        ) : (
                                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                        )}
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                            Status WhatsApp
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${
                                        isConnected 
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                                            : "bg-red-100 text-red-800 border-red-200"
                                    }`}>
                                        {isConnected ? "Online" : "Offline"}
                                    </span>
                                </div>

                                {/* Estatísticas da Org */}
                                <div className="grid grid-cols-2 gap-4 text-center py-2">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Leads</span>
                                        <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{org.leadCount}</span>
                                    </div>
                                    <div className="space-y-1 border-l border-zinc-150 dark:border-zinc-800">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Vendedores</span>
                                        <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">{org.userCount}</span>
                                    </div>
                                </div>

                                {/* Progresso / Atividade de Leads */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold text-zinc-500">
                                        <span>Conversão Ativa (IA)</span>
                                        <span>{org.activeLeads} de {org.leadCount} ({Math.round(activeRatio)}%)</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-zinc-950 dark:bg-zinc-100 h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${activeRatio}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {formatDate(org.createdAt)}
                                </span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                    Org Ativa
                                </span>
                            </div>
                        </div>
                    );
                })}

                {filteredOrgs.length === 0 && (
                    <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <AlertTriangle className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
                        <h4 className="font-bold text-zinc-700 dark:text-zinc-300">Nenhuma empresa encontrada</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Tente ajustar o termo de pesquisa.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
