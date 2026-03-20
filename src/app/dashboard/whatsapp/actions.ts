"use server";

import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { EvolutionService } from "@/lib/services/evolution";
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
}

export async function connectWhatsApp() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) throw new Error("Não autorizado. Faça login novamente.");

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        
        // Use organization specific credentials if available, otherwise fallback to system defaults
        const rawApiUrl = org?.evolutionApiUrl || process.env.EVOLUTION_API_URL || "";
        const apiUrl = normalizeUrl(rawApiUrl);
        const apiKey = org?.evolutionApiKey || process.env.EVOLUTION_API_KEY;

        if (!org) throw new Error("Organização não encontrada.");
        if (!apiUrl || !apiKey) {
            throw new Error("Credenciais da Evolution API não configuradas corretamente no sistema.");
        }

        // Usamos um nome estável por organização para evitar a criação de múltiplas instâncias
        const instanceName = `inst_${org.id.split('-')[0]}`;

        // 🚀 MELHORIA: Tentar verificar se a instância já existe e está funcional antes de deletar
        try {
            const instances = await EvolutionService.getInstances(apiUrl, apiKey);
            const existing = instances.find((i: any) => i.instanceName === instanceName || i.name === instanceName);
            
            if (existing) {
                const status = existing.status || existing.connectionStatus;
                console.log(`🔍 Instância ${instanceName} encontrada - Status: ${status}`);

                if (status === 'open') {
                    console.log(`✅ Instância ${instanceName} já está ativa. Reutilizando.`);
                    await OrganizationRepository.update(org.id, {
                        evolutionInstanceName: instanceName,
                        evolutionInstanceStatus: "connected"
                    });
                    revalidatePath("/dashboard/whatsapp");
                    return { success: true, status: "connected" };
                }

                if (status === 'connecting') {
                    console.log(`⏳ Instância ${instanceName} já está em processo de conexão. Não deletar.`);
                    // Prosseguir para o polling do QR Code via EvolutionService.connect
                } else {
                    // Se estiver em 'close' ou outro estado não funcional, deletamos para garantir um QR novo
                    console.log(`ℹ️ Reiniciando instância ${instanceName} no estado: ${status}`);
                    await EvolutionService.deleteInstance(apiUrl, apiKey, instanceName);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        } catch (e) {
            console.warn("⚠️ Falha ao verificar instâncias existentes, prosseguindo.");
        }

        // Connect via service
        console.log(`🚀 Iniciando nova conexão para instância: ${instanceName}`);

        const result = await EvolutionService.connect(
            org.id,
            apiUrl,
            apiKey,
            instanceName
        );

        // Update local status
        await OrganizationRepository.update(org.id, {
            evolutionInstanceName: instanceName,
            evolutionInstanceStatus: "connecting"
        });

        revalidatePath("/dashboard/whatsapp");
        return { success: true, ...result };
    } catch (error: any) {
        console.error("❌ Erro na Server Action connectWhatsApp:", error.message);
        return {
            success: false,
            error: error.message || "Erro interno no servidor de mensagens."
        };
    }
}

export async function disconnectWhatsApp() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    
    // Fallback to system defaults if organization specific ones are missing
    const apiUrl = normalizeUrl(org?.evolutionApiUrl || process.env.EVOLUTION_API_URL || "");
    const apiKey = org?.evolutionApiKey || process.env.EVOLUTION_API_KEY;

    if (!org || !apiUrl || !apiKey || !org.evolutionInstanceName) {
        return;
    }

    await EvolutionService.logout(
        apiUrl,
        apiKey,
        org.evolutionInstanceName
    );

    await OrganizationRepository.update(org.id, {
        evolutionInstanceStatus: "disconnected"
    });

    revalidatePath("/dashboard/whatsapp");
}
