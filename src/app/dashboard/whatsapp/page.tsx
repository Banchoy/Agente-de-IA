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

    const defaultApiUrl = process.env.EVOLUTION_API_URL;
    const defaultApiKey = process.env.EVOLUTION_API_KEY;
    
    const isConfigured = (!!org.evolutionApiUrl && !!org.evolutionApiKey) || (!!defaultApiUrl && !!defaultApiKey);
    const isConnected = org.evolutionInstanceStatus === "connected";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">WhatsApp</h1>
                    <p className="text-muted-foreground">Conecte sua conta do WhatsApp para automação de mensagens.</p>
                </div>

                {isConfigured && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-500/20">
                        <Wifi size={14} />
                        SISTEMA PRONTO
                    </div>
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Instance Status & Connect (Main View) */}
                <div className="lg:col-span-2 space-y-6">
                    {!isConfigured ? (
                        <div className="rounded-3xl border-2 border-dashed border-border bg-card p-12 text-center flex flex-col items-center">
                            <div className="h-20 w-20 bg-accent rounded-full flex items-center justify-center text-muted-foreground mb-6">
                                <WifiOff size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Aguardando Configuração</h3>
                            <p className="text-muted-foreground max-w-sm mt-2 mb-8 lowercase">
                                as credenciais da evolution api não foram encontradas. fale com o administrador.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden ring-1 ring-white/10">
                            <div className="bg-muted/30 p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-inner ${isConnected ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                                        <MessageSquare size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-foreground">{org.evolutionInstanceName || "WhatsApp Business"}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                {org.evolutionInstanceStatus || "Pronto para Conectar"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isConnected ? (
                                        <form action={disconnectWhatsApp}>
                                            <button className="flex items-center gap-2 rounded-xl bg-destructive/10 px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive shadow-sm hover:text-white transition-all active:scale-95 group">
                                                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                                Desconectar
                                            </button>
                                        </form>
                                    ) : (
                                        <WhatsAppConnectButton />
                                    )}
                                </div>
                            </div>

                            <div className="p-8">
                                {isConnected ? (
                                    <div className="space-y-6">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-1 hover:bg-muted/30 transition-colors">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mensagens Hoje</span>
                                                <p className="text-3xl font-black text-foreground">128</p>
                                            </div>
                                            <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-1 hover:bg-muted/30 transition-colors">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Uptime Instância</span>
                                                <p className="text-3xl font-black text-foreground">14d 2h</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 rounded-2xl bg-green-500/10 p-5 text-green-600 dark:text-green-400 border border-green-500/20">
                                            <div className="bg-green-500/20 p-2 rounded-lg">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Instância Ativa</p>
                                                <p className="text-xs opacity-80">Sua conta está sincronizada e pronta para enviar automações.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <h4 className="text-2xl font-black text-foreground">Apenas um passo...</h4>
                                            <p className="text-muted-foreground lowercase leading-relaxed">
                                                clique no botão acima para gerar o qr code. você precisará escanear ele com o whatsapp do seu celular.
                                            </p>
                                            <div className="pt-6">
                                                <div className="inline-flex items-center gap-3 rounded-2xl bg-primary/5 px-6 py-3 border border-primary/10">
                                                    <div className="flex -space-x-2">
                                                        <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">1</div>
                                                        <div className="w-8 h-8 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold italic">?</div>
                                                    </div>
                                                    <span className="text-xs font-bold text-foreground">Conexão Criptografada</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right/Side: Instructions & Advanced Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-3xl bg-primary shadow-xl shadow-primary/20 p-8 text-primary-foreground relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                            <MessageSquare size={120} />
                        </div>
                        <h4 className="text-lg font-black mb-3">Como Funciona?</h4>
                        <ul className="space-y-4 relative z-10">
                            {[
                                "Clique no botão 'Conectar WhatsApp'",
                                "Aguarde o QR Code aparecer na tela",
                                "Abra o WhatsApp no seu celular",
                                "Vá em Aparelhos Conectados > Conectar",
                                "Escaneie o código e pronto!"
                            ].map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm font-medium opacity-90">
                                    <span className="flex-none h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                        {i + 1}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Advanced Settings - Collapsed */}
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer list-none">
                                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                    <RefreshCw size={16} className="group-open:rotate-180 transition-transform" />
                                    Configurações Avançadas
                                </div>
                                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center group-open:bg-primary group-open:text-primary-foreground transition-colors">
                                    <Key size={12} />
                                </div>
                            </summary>
                            
                            <div className="mt-6 pt-6 border-t border-border space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <form action={saveEvolutionSettings} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">URL da Evolution API</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-3 text-muted-foreground/60" size={16} />
                                                <input
                                                    name="apiUrl"
                                                    defaultValue={org.evolutionApiUrl || defaultApiUrl || ""}
                                                    placeholder="https://sua-api.com"
                                                    className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Global API Key</label>
                                            <input
                                                type="password"
                                                name="apiKey"
                                                defaultValue={org.evolutionApiKey || defaultApiKey || ""}
                                                placeholder="Sua Global API Key"
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full rounded-xl bg-foreground text-background py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98]"
                                    >
                                        Atualizar Credenciais
                                    </button>
                                </form>
                                
                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                    <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-relaxed uppercase tracking-tight">
                                        Aviso: use estas configurações apenas se precisar conectar a um servidor diferente do padrão do sistema.
                                    </p>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
}
