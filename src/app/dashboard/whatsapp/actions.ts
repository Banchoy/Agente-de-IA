"use server";

import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { EvolutionService } from "@/lib/services/evolution";
import { revalidatePath } from "next/cache";

export async function saveEvolutionSettings(formData: FormData) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Unauthorized");

    let apiUrl = (formData.get("apiUrl") as string).trim();
    const apiKey = (formData.get("apiKey") as string).trim();

    // Normalização básica da URL
    if (!apiUrl.startsWith("http")) {
        apiUrl = `https://${apiUrl}`;
    }
    // Remove barra no final se existir
    apiUrl = apiUrl.replace(/\/$/, "");

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
        if (!org || !org.evolutionApiUrl || !org.evolutionApiKey) {
            throw new Error("Credenciais da Evolution API não configuradas corretamente.");
        }

        const instanceName = org.evolutionInstanceName || `inst_${org.id.split('-')[0]}`;

        // Connect via service
        console.log(`🚀 Iniciando conexão para instância: ${instanceName} na URL: ${org.evolutionApiUrl}`);

        const result = await EvolutionService.connect(
            org.id,
            org.evolutionApiUrl,
            org.evolutionApiKey,
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
    if (!org || !org.evolutionApiUrl || !org.evolutionApiKey || !org.evolutionInstanceName) {
        return;
    }

    await EvolutionService.logout(
        org.evolutionApiUrl,
        org.evolutionApiKey,
        org.evolutionInstanceName
    );

    await OrganizationRepository.update(org.id, {
        evolutionInstanceStatus: "disconnected"
    });

    revalidatePath("/dashboard/whatsapp");
}
