"use server";

import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { WhatsappService } from "@/lib/services/whatsapp";
import { revalidatePath } from "next/cache";

const normalizeUrl = (url: string) => {
    let normalized = url.trim();
    if (!normalized) return "";
    if (!normalized.startsWith("http")) {
        normalized = `https://${normalized}`;
    }
    return normalized.replace(/\/$/, "");
};

// ... (saveEvolutionSettings can stay for now, but we don't need it)

export async function connectWhatsApp() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) throw new Error("Não autorizado. Faça login novamente.");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organização não encontrada.");

        const sessionId = `inst_${org.id.split('-')[0]}`;
        
        console.log(`🔌 [Baileys] Solicitando conexão para: ${sessionId}`);
        
        // Disparar conexão assíncrona
        // O polling do frontend vai pegar o status e o QR via /api/whatsapp/status
        WhatsappService.connect(org.id, sessionId);

        return { success: true, status: "connecting" };
    } catch (error: any) {
        console.error("❌ Erro ao conectar WhatsApp:", error.message);
        return { success: false, error: error.message };
    }
}

export async function disconnectWhatsApp() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) throw new Error("Unauthorized");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org || !org.evolutionInstanceName) return;

        const sessionId = org.evolutionInstanceName;
        const session = WhatsappService.getSession(sessionId);

        if (session && session.sock) {
            await session.sock.logout();
            WhatsappService.sessions.delete(sessionId);
        }

        await OrganizationRepository.update(org.id, {
            evolutionInstanceStatus: "disconnected"
        });

        revalidatePath("/dashboard/whatsapp");
    } catch (error: any) {
        console.error("❌ Erro ao desconectar:", error.message);
    }
}
