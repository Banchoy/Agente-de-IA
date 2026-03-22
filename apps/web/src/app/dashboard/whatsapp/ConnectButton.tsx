"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, QrCode, X, RefreshCw } from "lucide-react";
import { connectWhatsApp, resetWhatsApp } from "./actions";
 
export default function WhatsAppConnectButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
 
    // Polling para checar status detalhado via Baileys interno
    const pollStatus = async () => {
        try {
            const response = await fetch("/api/whatsapp/status");
            const data = await response.json();
 
            if (data.status === "open" || data.status === "connected") {
                setShowModal(false);
                window.location.reload(); 
                return;
            }
 
            if (data.qr) {
                setQrCode(data.qr);
                if (!showModal) setShowModal(true);
            } else {
                setQrCode(null);
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    };
 
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (showModal || isLoading) {
            interval = setInterval(pollStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [showModal, isLoading]);
 
    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const result = await connectWhatsApp();
            if (result && !result.success) {
                alert(`Erro: ${result.error}`);
                setIsLoading(false);
                return;
            }
 
            // O polling via useEffect vai cuidar de pegar o QR code assim que disponível
            setShowModal(true);
        } catch (error: any) {
            console.error("Failed to connect:", error);
            alert(`Falha na comunicação com o servidor: ${error.message || "Tente novamente mais tarde."}`);
            setIsLoading(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Isso irá apagar todos os dados da sessão no banco de dados e desconectar qualquer tentativa atual. Deseja continuar?")) return;
        
        setIsResetting(true);
        setQrCode(null);
        try {
            const result = await resetWhatsApp();
            if (result.success) {
                alert("Sessão resetada com sucesso! Tente conectar novamente.");
                setShowModal(false);
            } else {
                alert(`Erro ao resetar: ${result.error}`);
            }
        } catch (error: any) {
            alert(`Erro: ${error.message}`);
        } finally {
            setIsResetting(false);
            setIsLoading(false);
        }
    };
 
    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Plus size={18} />
                    )}
                    Conectar WhatsApp
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-sm rounded-3xl bg-card p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-border">
                        <button
                            onClick={() => setShowModal(false)}
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
