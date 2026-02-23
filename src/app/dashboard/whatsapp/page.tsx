import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { MessageSquare, RefreshCw, Key, Globe, LogOut, CheckCircle, Wifi, WifiOff } from "lucide-react";
import { saveEvolutionSettings, disconnectWhatsApp } from "./actions";
import WhatsAppConnectButton from "./ConnectButton";

export default async function WhatsAppPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    const isConfigured = !!org.evolutionApiUrl && !!org.evolutionApiKey;
    const isConnected = org.evolutionInstanceStatus === "connected";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">WhatsApp</h1>
                <p className="text-zinc-600">Conecte sua conta do WhatsApp via Evolution API para automação.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left: Configuration Form */}
                <div className="lg:col-span-1 space-y-6">
                    <form action={saveEvolutionSettings} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-zinc-900 font-bold border-b border-zinc-100 pb-4">
                            <Key size={18} />
                            Credenciais Evolution API
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">URL da API</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 text-zinc-400" size={16} />
                                    <input
                                        name="apiUrl"
                                        defaultValue={org.evolutionApiUrl || ""}
                                        placeholder="https://sua-api.com"
                                        required
                                        className="w-full rounded-lg border border-zinc-200 pl-10 pr-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Global API Key</label>
                                <input
                                    type="password"
                                    name="apiKey"
                                    defaultValue={org.evolutionApiKey || ""}
                                    placeholder="Sua Global API Key"
                                    required
                                    className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all active:scale-[0.98]"
                        >
                            Salvar Credenciais
                        </button>
                    </form>

                    <div className="rounded-2xl bg-zinc-100 p-6 space-y-3">
                        <h4 className="text-sm font-bold text-zinc-900">Como obter as credenciais?</h4>
                        <p className="text-xs text-zinc-600 leading-relaxed">
                            As credenciais são obtidas no seu servidor da **Evolution API**. A URL é o endereço onde a API está rodando e a Key é definida na instalação.
                        </p>
                    </div>
                </div>

                {/* Right: Instance Status & Connect */}
                <div className="lg:col-span-2 space-y-6">
                    {!isConfigured ? (
                        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center flex flex-col items-center">
                            <div className="h-16 w-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mb-4">
                                <WifiOff size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900">Aguardando Configuração</h3>
                            <p className="text-zinc-600 max-w-sm mt-2">Configure os dados da API ao lado primeiro para poder conectar seu WhatsApp.</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                            <div className="bg-zinc-50 p-6 border-b border-zinc-200 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        <MessageSquare size={26} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900">{org.evolutionInstanceName || "WhatsApp Business"}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                {org.evolutionInstanceStatus || "Inativo"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isConnected ? (
                                    <form action={disconnectWhatsApp}>
                                        <button className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-all">
                                            <LogOut size={18} />
                                            Desconectar
                                        </button>
                                    </form>
                                ) : (
                                    <WhatsAppConnectButton />
                                )}
                            </div>

                            <div className="p-8">
                                {isConnected ? (
                                    <div className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-1">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Mensagens Hoje</span>
                                                <p className="text-2xl font-black text-zinc-900">128</p>
                                            </div>
                                            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-1">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Uptime Instância</span>
                                                <p className="text-2xl font-black text-zinc-900">14d 2h</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-green-700 border border-green-100">
                                            <CheckCircle size={20} />
                                            <p className="text-sm font-medium">Sua instância está operando normalmente e pronta para automação.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <h4 className="font-bold text-zinc-900 mb-2">Pronto para Conectar!</h4>
                                        <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
                                            Clique no botão acima para iniciar a sincronização. Um QR Code será gerado para você escanear com seu celular.
                                        </p>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1 text-[11px] font-bold text-blue-700 border border-blue-100 uppercase">
                                            <Wifi size={14} />
                                            Conexão Segura
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
