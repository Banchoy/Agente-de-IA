import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { Settings as SettingsIcon, Building, Info, ShieldCheck, Database } from "lucide-react";

export default async function SettingsPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    return (
        <div className="space-y-8 max-w-4xl mr-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Configurações</h1>
                <p className="text-zinc-600">Gerencie as preferências e os dados da sua organização.</p>
            </div>

            <div className="grid gap-8">
                {/* Organization Details */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-zinc-900 font-bold border-b border-zinc-100 pb-4">
                        <Building size={18} />
                        Detalhes da Organização
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Nome da Organização</label>
                            <input
                                readOnly
                                value={org.name}
                                className="w-full rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Clerk Org ID</label>
                            <input
                                readOnly
                                value={org.clerkOrgId}
                                className="w-full rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed font-mono"
                            />
                        </div>
                        <div className="space-y-2 mt-4">
                            <span className="text-xs text-zinc-400 italic">Os dados da organização são sincronizados automaticamente via Clerk.</span>
                        </div>
                    </div>
                </div>

                {/* Security & System Info */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="flex items-center gap-2 font-bold text-zinc-900">
                            <ShieldCheck size={18} className="text-green-600" />
                            Segurança
                        </h3>
                        <p className="text-sm text-zinc-600">
                            Sua organização está operando em um ambiente isolado (Multi-tenant) com criptografia ponta a ponta nas chaves de API.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="flex items-center gap-2 font-bold text-zinc-900">
                            <Database size={18} className="text-blue-600" />
                            Banco de Dados
                        </h3>
                        <p className="text-sm text-zinc-600">
                            Conexão ativa com Supabase PostgreSQL. Sincronização de logs de auditoria habilitada.
                        </p>
                    </div>
                </div>

                {/* Integration Link Info */}
                <div className="rounded-2xl bg-zinc-900 text-white p-8 flex items-center justify-between shadow-xl">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Gerencie suas Integrações</h3>
                        <p className="text-zinc-400 text-sm">Configure o WhatsApp e outras APIs em suas respectivas seções.</p>
                    </div>
                    <Info size={40} className="text-zinc-700" />
                </div>
            </div>
        </div>
    );
}
