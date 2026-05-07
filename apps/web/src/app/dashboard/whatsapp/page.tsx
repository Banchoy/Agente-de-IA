import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { UserService } from "@/lib/services/user";
import { MessageSquare, LogOut, CheckCircle, Wifi } from "lucide-react";
import WhatsAppStatusPoller from "./StatusPoller";

export default async function WhatsAppPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    // Sincroniza usuário e organização com o banco de dados
    await UserService.syncUser();

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    
    if (!org) {
        return (
            <div className="p-8 text-center rounded-3xl border border-amber-200 bg-amber-50 text-amber-900 max-w-2xl mx-auto mt-10 shadow-xl">
                <h1 className="text-2xl font-black mb-4">Sincronização Necessária</h1>
                <p className="mb-6 font-medium">Não conseguimos localizar os dados da sua organização no nosso banco de dados. Isso pode ser um delay temporário do sistema.</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 transition-all"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

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

            {/* Client component que faz polling e renderiza o estado correto */}
            <WhatsAppStatusPoller />
        </div>
    );
}
