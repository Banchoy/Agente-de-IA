"use client";

import { useState } from "react";
import { 
    Search, 
    Smartphone, 
    Users, 
    Layers, 
    AlertTriangle, 
    Calendar, 
    TrendingUp, 
    ShieldAlert,
    Trash2,
    Loader2,
    X,
    UserCheck,
    Briefcase,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { getOrgDetailsAction, deleteOrgAction, updateUserRoleAction } from "./actions";

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

interface LeadDetail {
    id: string;
    name: string;
    phone: string | null;
    aiActive: string;
    source: string;
    createdAt: string;
}

interface UserDetail {
    id: string;
    role: string;
    clerkUserId: string;
    createdAt: string;
}

export default function MasterPanelClient({ initialOrgs }: { initialOrgs: OrgMetric[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [orgs, setOrgs] = useState<OrgMetric[]>(initialOrgs);
    
    // Estados do Modal
    const [selectedOrg, setSelectedOrg] = useState<OrgMetric | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'leads' | 'members'>('general');
    
    // Dados carregados sob demanda
    const [leadsList, setLeadsList] = useState<LeadDetail[]>([]);
    const [usersList, setUsersList] = useState<UserDetail[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    // Estado de exclusão
    const [confirmName, setConfirmName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Estado de alteração de role
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingUserId(userId);
        try {
            const res = await updateUserRoleAction(userId, newRole);
            if (res.success) {
                setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                alert(res.error || "Erro ao atualizar a role.");
            }
        } catch (error: any) {
            alert(error.message || "Erro desconhecido ao atualizar a role.");
        } finally {
            setUpdatingUserId(null);
        }
    };

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

    // Abrir modal de detalhes e carregar leads/membros
    const handleOpenDetails = async (org: OrgMetric) => {
        setSelectedOrg(org);
        setIsModalOpen(true);
        setActiveTab('general');
        setIsLoadingDetails(true);
        setDetailsError(null);
        setConfirmName("");
        setDeleteError(null);
        setLeadsList([]);
        setUsersList([]);

        const res = await getOrgDetailsAction(org.id);
        setIsLoadingDetails(false);

        if (res.success && res.leads && res.users) {
            setLeadsList(res.leads);
            setUsersList(res.users);
        } else {
            setDetailsError(res.error || "Não foi possível carregar os dados em tempo real.");
        }
    };

    // Executar exclusão da organização
    const handleDeleteOrg = async () => {
        if (!selectedOrg) return;
        if (confirmName !== selectedOrg.name) return;

        setIsDeleting(true);
        setDeleteError(null);

        const res = await deleteOrgAction(selectedOrg.id);
        setIsDeleting(false);

        if (res.success) {
            // Remover da lista local para atualizar na hora
            setOrgs(prev => prev.filter(o => o.id !== selectedOrg.id));
            setIsModalOpen(false);
            setSelectedOrg(null);
        } else {
            setDeleteError(res.error || "Ocorreu um erro ao excluir a empresa.");
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

            {/* Barra de Busca */}
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
                            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between relative overflow-hidden"
                        >
                            {/* Tarjeta de Plano */}
                            <div className="absolute top-0 right-0 left-0 h-1.5 bg-zinc-150 dark:bg-zinc-800" />
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

                            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                                    <Calendar size={12} />
                                    {formatDate(org.createdAt)}
                                </span>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleOpenDetails(org)}
                                    className="text-xs font-semibold h-8 rounded-lg bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Gerenciar
                                    <ChevronRight size={12} className="ml-1" />
                                </Button>
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

            {/* Modal de Detalhes e Ações de Administração Master */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                            <span>Gerenciar Empresa: {selectedOrg?.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-400">
                            Organização ID: {selectedOrg?.id}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Guias do Modal */}
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 mt-4">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === 'general'
                                    ? 'border-zinc-950 text-zinc-950 dark:border-zinc-50 dark:text-zinc-50'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                            }`}
                        >
                            Visão Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('leads')}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === 'leads'
                                    ? 'border-zinc-950 text-zinc-950 dark:border-zinc-50 dark:text-zinc-50'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                            }`}
                        >
                            Leads ({isLoadingDetails ? "..." : leadsList.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === 'members'
                                    ? 'border-zinc-950 text-zinc-950 dark:border-zinc-50 dark:text-zinc-50'
                                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                            }`}
                        >
                            Vendedores ({isLoadingDetails ? "..." : usersList.length})
                        </button>
                    </div>

                    {/* Conteúdo das Guias */}
                    <div className="py-4">
                        {activeTab === 'general' && selectedOrg && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                        <span className="text-[10px] text-zinc-400 block font-semibold uppercase tracking-wider">Status do Plano</span>
                                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                                            {selectedOrg.subscriptionStatus === "active" ? "Assinatura Ativa" : "Demonstração (Trial)"}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                        <span className="text-[10px] text-zinc-400 block font-semibold uppercase tracking-wider">Data de Cadastro</span>
                                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                            {formatDate(selectedOrg.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Zona Perigosa: Exclusão */}
                                <div className="border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                        <AlertTriangle size={18} />
                                        <h4 className="text-sm font-bold">Zona de Perigo</h4>
                                    </div>
                                    <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                                        A exclusão da empresa é **irreversível**. Esta ação encerrará imediatamente qualquer conexão ativa de WhatsApp dos vendedores e removerá de forma permanente todos os leads, mensagens e dados vinculados do banco de dados.
                                    </p>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-red-700 dark:text-red-400">
                                            Digite <strong className="select-all">EXCLUIR {selectedOrg.name}</strong> para confirmar:
                                        </label>
                                        <input
                                            type="text"
                                            value={confirmName}
                                            onChange={(e) => setConfirmName(e.target.value)}
                                            placeholder={`EXCLUIR ${selectedOrg.name}`}
                                            className="w-full px-3 py-2 border border-red-200 dark:border-red-900/50 rounded-xl text-xs bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-red-500 text-red-900 dark:text-red-200"
                                        />
                                    </div>

                                    {deleteError && (
                                        <p className="text-xs font-bold text-red-600">{deleteError}</p>
                                    )}

                                    <Button
                                        variant="destructive"
                                        disabled={confirmName !== `EXCLUIR ${selectedOrg.name}` || isDeleting}
                                        onClick={handleDeleteOrg}
                                        className="w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Excluindo Organização...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={14} />
                                                Excluir Organização de Forma Definitiva
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'leads' && (
                            <div className="space-y-4">
                                {isLoadingDetails ? (
                                    <div className="py-12 flex justify-center items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                        <Loader2 className="animate-spin" size={16} />
                                        <span className="text-xs font-medium">Buscando leads em tempo real...</span>
                                    </div>
                                ) : detailsError ? (
                                    <div className="py-8 text-center text-xs font-bold text-red-500">{detailsError}</div>
                                ) : leadsList.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                        Nenhum lead encontrado para esta empresa.
                                    </div>
                                ) : (
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 select-none">
                                        {leadsList.map(lead => (
                                            <div 
                                                key={lead.id} 
                                                className="p-3 border border-zinc-150 dark:border-zinc-800 rounded-xl flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                            >
                                                <div>
                                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">{lead.name}</span>
                                                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                                                        Fone: {lead.phone || "N/A"} | Origem: {lead.source}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                                        lead.aiActive === "true"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                                    }`}>
                                                        IA: {lead.aiActive === "true" ? "Ativa" : "Pausada"}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 shrink-0">
                                                        {formatDate(lead.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div className="space-y-4">
                                {isLoadingDetails ? (
                                    <div className="py-12 flex justify-center items-center gap-2 text-zinc-500 dark:text-zinc-400">
                                        <Loader2 className="animate-spin" size={16} />
                                        <span className="text-xs font-medium">Buscando vendedores...</span>
                                    </div>
                                ) : detailsError ? (
                                    <div className="py-8 text-center text-xs font-bold text-red-500">{detailsError}</div>
                                ) : usersList.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                        Nenhum vendedor cadastrado nesta empresa.
                                    </div>
                                ) : (
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                                        {usersList.map(user => (
                                            <div 
                                                key={user.id} 
                                                className="p-3 border border-zinc-150 dark:border-zinc-800 rounded-xl flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg">
                                                        <UserCheck size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={user.role}
                                                                disabled={updatingUserId === user.id}
                                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                                className="text-xs font-bold bg-transparent border-0 border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-0 focus:border-zinc-950 dark:focus:border-zinc-50 pb-0.5 pr-6 cursor-pointer disabled:opacity-50"
                                                            >
                                                                <option value="admin" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Administrador (Pago)</option>
                                                                <option value="admin_test" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Administrador (Teste - Grátis)</option>
                                                                <option value="vendedor" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Vendedor (Pago)</option>
                                                                <option value="vendedor_test" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Vendedor (Teste - Grátis)</option>
                                                                <option value="master" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Master</option>
                                                            </select>
                                                            {updatingUserId === user.id && (
                                                                <Loader2 className="animate-spin text-zinc-400 h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-zinc-400 block mt-1 select-all">
                                                            Clerk: {user.clerkUserId}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-zinc-400">
                                                    {formatDate(user.createdAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
