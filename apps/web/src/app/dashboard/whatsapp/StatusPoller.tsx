"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, LogOut, CheckCircle, QrCode, Loader2, X, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { connectWhatsApp, disconnectWhatsApp, resetWhatsApp } from "./actions";

type ConnectionStatus = "disconnected" | "connecting" | "open" | "connected" | "close" | "unknown";

export default function WhatsAppStatusPoller() {
    const [status, setStatus] = useState<ConnectionStatus>("unknown");
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const isConnected = status === "open" || status === "connected";

    const pollStatus = useCallback(async () => {
        try {
            const response = await fetch("/api/whatsapp/status", { cache: "no-store" });
            if (!response.ok) return;
            const data = await response.json();

            const newStatus = data.status || "disconnected";
            setStatus(newStatus);

            if (newStatus === "open" || newStatus === "connected") {
                // Conectou! Fechar modal se estiver aberto
                if (showQrModal) {
                    setShowQrModal(false);
                    setIsLoading(false);
                }
                setQrCode(null);
            } else if (data.qr) {
                setQrCode(data.qr);
                if (!showQrModal && isLoading) {
                    setShowQrModal(true);
                }
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    }, [showQrModal, isLoading]);

    // Polling global a cada 3 segundos — SEMPRE ativo
    useEffect(() => {
        pollStatus(); // Primeira checagem imediata
        const interval = setInterval(pollStatus, 3000);
        return () => clearInterval(interval);
    }, [pollStatus]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const result = await connectWhatsApp();
            if (result && !result.success) {
                alert(`Erro: ${result.error}`);
                setIsLoading(false);
                return;
            }
            setShowQrModal(true);
        } catch (error: any) {
            console.error("Failed to connect:", error);
            alert(`Falha na comunicação com o servidor: ${error.message || "Tente novamente mais tarde."}`);
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Deseja desconectar o WhatsApp?")) return;
        setIsDisconnecting(true);
        try {
            await disconnectWhatsApp();
            setStatus("disconnected");
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setIsDisconnecting(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Isso irá apagar todos os dados da sessão no banco de dados e desconectar qualquer tentativa atual. Deseja continuar?")) return;
        setIsResetting(true);
        setQrCode(null);
        try {
            await resetWhatsApp();
            alert("Sessão resetada com sucesso! Tente conectar novamente.");
            setShowQrModal(false);
            setStatus("disconnected");
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setIsResetting(false);
            setIsLoading(false);
        }
    };

    const statusColor = isConnected ? "bg-green-500" : status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-red-500";
    const statusText = isConnected
        ? "Conectado"
        : status === "connecting"
            ? "Conectando..."
            : status === "unknown"
                ? "Verificando..."
                : "Desconectado";

    return (
        <>
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Card */}
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
                                        <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            {statusText}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {isConnected ? (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={handleDisconnect}
                                            disabled={isDisconnecting}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive shadow-sm hover:text-white transition-all active:scale-95 group disabled:opacity-50"
                                        >
                                            {isDisconnecting ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                            )}
                                            Desconectar
                                        </button>
                                        <button
                                            onClick={handleReset}
                                            className="w-full text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest text-center mt-1"
                                        >
                                            Reiniciar Sessão (Forçar Reset)
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleConnect}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Wifi size={18} />
                                        )}
                                        Conectar WhatsApp
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-8">
                            {isConnected ? (
                                <div className="space-y-6">
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

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-sm rounded-3xl bg-card p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-border">
                        <button
                            onClick={() => { setShowQrModal(false); setIsLoading(false); }}
                            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-foreground">Escanear QR Code</h3>
                                <p className="text-sm text-muted-foreground">Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
                            </div>

                            <div className="mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-2xl bg-white border-8 border-white p-2">
                                {qrCode ? (
                                    <img src={qrCode} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 size={32} className="animate-spin" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Gerando...</span>
                                        </div>

                                        {!isResetting && (
                                            <button
                                                onClick={handleReset}
                                                className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase"
                                            >
                                                <RefreshCw size={12} />
                                                Problemas? Resetar Sessão
                                            </button>
                                        )}

                                        {isResetting && (
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Limpando banco de dados...</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase">
                                    <QrCode size={14} />
                                    Válido por 30 segundos
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Após escanear, esta janela fechará automaticamente assim que a conexão for confirmada.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
