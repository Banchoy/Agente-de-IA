"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, QrCode, X } from "lucide-react";
import { connectWhatsApp } from "./actions";

export default function WhatsAppConnectButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Polling to check connection status
    const pollStatus = async () => {
        try {
            // This is a simplified check. In a real app, you'd call a dedicated 'status' endpoint.
            // For now, we reuse connectWhatsApp or a new status action.
            const response = await fetch("/api/integrations/whatsapp/status");
            const data = await response.json();

            if (data.status === "connected" || data.status === "open") {
                setShowModal(false);
                window.location.reload(); // Refresh to show connected state
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (showModal) {
            interval = setInterval(pollStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [showModal]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            const result = await connectWhatsApp();
            if (result && result.code) {
                setQrCode(result.code);
                setShowModal(true);
            } else if (result && (result.status === "connected" || result.status === "open")) {
                alert("WhatsApp já está conectado!");
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to connect:", error);
            alert("Erro ao conectar. Verifique as credenciais da API.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : (
                    <Plus size={18} />
                )}
                Conectar WhatsApp
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-zinc-900">Escanear QR Code</h3>
                                <p className="text-sm text-zinc-500">Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
                            </div>

                            <div className="mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-2xl bg-zinc-50 border-8 border-zinc-50 flex items-center justify-center p-2">
                                {qrCode ? (
                                    <img src={qrCode} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                                        <Loader2 size={32} className="animate-spin" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Gerando...</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-[10px] font-bold text-amber-700 border border-amber-100 uppercase">
                                    <QrCode size={14} />
                                    Válido por 30 segundos
                                </div>
                                <p className="text-[10px] text-zinc-400">
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
