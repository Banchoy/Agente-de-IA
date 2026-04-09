import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { MessageSquare, LogOut, CheckCircle, Wifi } from "lucide-react";
import { disconnectWhatsApp, resetWhatsApp } from "./actions";
import WhatsAppConnectButton from "./ConnectButton";
import WhatsAppStatusPoller from "./StatusPoller";

export default async function WhatsAppPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

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
