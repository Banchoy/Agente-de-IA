import { MessageSquare, RefreshCw, Plus, ExternalLink } from "lucide-react";

export default function WhatsAppPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">WhatsApp</h1>
                    <p className="text-zinc-600">Conecte sua conta do WhatsApp via Evolution API.</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-all">
                    <Plus size={18} />
                    Nova Instância
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Instance Card Example */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-green-100 text-green-700">
                                <MessageSquare size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">Instância_Principal</h3>
                                <p className="text-xs text-zinc-500">v1.2.0 • Evolution API</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold text-green-700 uppercase tracking-wider border border-green-100">
                            Conectado
                        </div>
                    </div>

                    <div className="pt-2">
                        <p className="text-sm text-zinc-600 mb-4">Instance ID: <code className="bg-zinc-100 px-1 rounded">clerk_org_123</code></p>
                        <div className="flex gap-2">
                            <button className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2 text-xs font-medium hover:bg-zinc-50 transition-colors">
                                <RefreshCw size={14} />
                                Recarregar
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2 text-xs font-medium hover:bg-zinc-50 transition-colors">
                                <ExternalLink size={14} />
                                Gerenciar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Configuration Help */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-4 border-dashed">
                    <h3 className="font-bold text-zinc-900">Configuração Requerida</h3>
                    <p className="text-sm text-zinc-600">
                        Para habilitar a integração, certifique-se de que as variáveis de ambiente da **Evolution API** estão configuradas no servidor:
                    </p>
                    <ul className="space-y-2 text-xs text-zinc-500 font-mono">
                        <li>• EVOLUTION_API_URL</li>
                        <li>• EVOLUTION_API_KEY</li>
                    </ul>
                    <div className="pt-2">
                        <button className="text-sm font-semibold text-zinc-900 hover:underline">
                            Ver documentação de integração →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
