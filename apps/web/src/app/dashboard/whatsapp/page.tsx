import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { MessageSquare, LogOut, CheckCircle, Wifi } from "lucide-react";
import { disconnectWhatsApp, resetWhatsApp } from "./actions";
import WhatsAppConnectButton from "./ConnectButton";

export default async function WhatsAppPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    // Status real vem via polling do ConnectButton (/api/whatsapp/status)
    // Não usamos mais evolutionInstanceStatus (campo legado da Evolution API)
    const isConnected = false; // SSR sempre false — ConnectButton detecta o estado real via client

    return (
        <div className="space-y-6 text-foreground">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
                    <p className="text-muted-foreground">Conecte sua conta do WhatsApp para automação de mensagens.</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-500/20">
                    <Wifi size={14} />
                    SISTEMA PRONTO
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Instance Status & Connect (Main View) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden ring-1 ring-white/10">
                        <div className="bg-muted/30 p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-inner ${isConnected ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                                    <MessageSquare size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">WhatsApp Business</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`h-2.5 w-2.5 rounded-full bg-amber-500`} />
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            Verificando conexão...
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {isConnected ? (
                                    <div className="flex flex-col gap-2">
                                        <form action={disconnectWhatsApp}>
                                            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive shadow-sm hover:text-white transition-all active:scale-95 group">
                                                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                                Desconectar
                                            </button>
                                        </form>
                                        <form action={resetWhatsApp}>
                                            <button className="w-full text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest text-center mt-1">
                                                Reiniciar Sessão (Forçar Reset)
                                            </button>
                                        </form>
                                    </div>
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
                                            <p className="text-3xl font-black">128</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-1 hover:bg-muted/30 transition-colors">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Uptime Instância</span>
                                            <p className="text-3xl font-black">14d 2h</p>
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
                                        <h4 className="text-2xl font-black">Apenas um passo...</h4>
                                        <p className="text-muted-foreground lowercase leading-relaxed">
                                            clique no botão acima para gerar o qr code. você precisará escanear ele com o whatsapp do seu celular.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right/Side: Instructions */}
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
                </div>
            </div>
        </div>
    );
}
