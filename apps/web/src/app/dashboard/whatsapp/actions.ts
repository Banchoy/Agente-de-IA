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

// saveEvolutionSettings removida — sistema agora usa Baileys nativo (sem Evolution API)

export async function connectWhatsApp() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) throw new Error("Não autorizado. Faça login novamente.");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organização não encontrada.");

        const sessionId = `wa_${org.id.split('-')[0]}`;
        
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
        if (!org) throw new Error("Não autorizado.");

        const sessionId = `wa_${org.id.split('-')[0]}`;
        const session = WhatsappService.sessions.get(sessionId);

        console.log(`🔌 [Baileys] Desconectando sessão: ${sessionId}`);

        // 1. Limpar sessão no banco
        await WhatsappService.deleteSessionFromDb(sessionId);

        // 2. Limpar memória e deslogar sock
        if (session && session.sock) {
            try {
                await session.sock.logout();
            } catch (e) {}
            WhatsappService.sessions.delete(sessionId);
        }

        // 3. Atualizar status (campos neutros compatíveis com o banco)
        await OrganizationRepository.update(org.id, {
            evolutionInstanceStatus: "disconnected",
            evolutionQrCode: null
        });

        revalidatePath("/dashboard/whatsapp");
    } catch (error: any) {
        console.error("❌ Erro ao desconectar:", error.message);
    }
}

export async function resetWhatsApp() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) throw new Error("Unauthorized");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        const sessionId = `wa_${org.id.split('-')[0]}`;
        
        console.log(`🔌 [Baileys] Resetando totalmente a sessão: ${sessionId}`);
        
        // 1. Wipe DB (Baileys service handles the db logic)
        await WhatsappService.deleteSessionFromDb(sessionId);
        
        // 2. Clear Memory
        const session = WhatsappService.sessions.get(sessionId);
        if (session && session.sock) {
            try { await session.sock.logout(); } catch(e) {}
        }
        WhatsappService.sessions.delete(sessionId);

        // 3. Atualizar status
        await OrganizationRepository.update(org.id, {
            evolutionInstanceStatus: "disconnected",
            evolutionQrCode: null
        });

        revalidatePath("/dashboard/whatsapp");
    } catch (error: any) {
        console.error("❌ Erro ao resetar:", error.message);
    }
}
