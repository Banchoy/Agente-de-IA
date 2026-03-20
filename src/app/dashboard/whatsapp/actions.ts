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

export async function saveEvolutionSettings(formData: FormData) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) throw new Error("Unauthorized");

        const apiUrl = normalizeUrl(formData.get("apiUrl") as string);
        const apiKey = (formData.get("apiKey") as string).trim();

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) throw new Error("Organization not found");

        await OrganizationRepository.update(org.id, {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
        });

        revalidatePath("/dashboard/whatsapp");
    } catch (error: any) {
        console.error("❌ Erro ao salvar configurações:", error.message);
    }
}

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
        if (!org || !org.evolutionInstanceName) return;

        const sessionId = org.evolutionInstanceName;
        const session = WhatsappService.getSession(sessionId);

        if (session && session.sock) {
            try {
                await session.sock.logout();
            } catch (e) {}
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
        const session = WhatsappService.getSession(sessionId);
        if (session && session.sock) {
            try { await session.sock.logout(); } catch(e) {}
        }
        WhatsappService.sessions.delete(sessionId);

        // 3. Update Org Status
        await OrganizationRepository.update(org.id, {
            evolutionInstanceStatus: "disconnected",
            evolutionInstanceName: null
        });

        revalidatePath("/dashboard/whatsapp");
        return { success: true };
    } catch (error: any) {
        console.error("❌ Erro ao resetar:", error.message);
        return { success: false, error: error.message };
    }
}
