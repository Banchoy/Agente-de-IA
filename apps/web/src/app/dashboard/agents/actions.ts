"use server";

import { auth } from "@clerk/nextjs/server";
import { AgentRepository } from "@/lib/repositories/agent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAgent(formData: FormData) {
    const { userId, orgId: clerkOrgId } = await auth();
    if (!userId || !clerkOrgId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const whatsappInstanceName = formData.get("whatsappInstanceName") as string;
    const provider = formData.get("provider") as string;
    const model = formData.get("model") as string;
    const systemPrompt = formData.get("systemPrompt") as string;
    const agentRealName = formData.get("agentRealName") as string;
    const businessName = formData.get("businessName") as string;
    const marketOportunities = formData.get("marketOportunities") as string;
    const successCase = formData.get("successCase") as string;

    if (!name || !provider || !model || !systemPrompt) {
        throw new Error("Missing required fields");
    }

    // O withOrgContext já resolve o dbOrg.id para nós no Repositório
    await AgentRepository.create({
        name,
        description,
        organizationId: "", // Será preenchido pelo withOrgContext via RLS ou similar, mas aqui passamos vazio pois o Repo injeta
        status: "active",
        whatsappInstanceName,
        config: {
            provider,
            model,
            systemPrompt,
            agentRealName,
            businessName,
            marketOportunities,
            successCase,
            temperature: 0.7,
            whatsappResponse: true
        }
    });

    revalidatePath("/dashboard/agents");
    redirect("/dashboard/agents");
}

export async function updateAgent(id: string, formData: FormData) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const provider = formData.get("provider") as string;
    const model = formData.get("model") as string;
    const systemPrompt = formData.get("systemPrompt") as string;
    const temperature = parseFloat(formData.get("temperature") as string || "0.7");
    const testMode = formData.get("testMode") === "on";
    const testNumber = formData.get("testNumber") as string;
    const whatsappResponse = formData.get("whatsappResponse") === "on";
    const whatsappInstanceName = formData.get("whatsappInstanceName") as string;
    const agentRealName = formData.get("agentRealName") as string;
    const businessName = formData.get("businessName") as string;
    const marketOportunities = formData.get("marketOportunities") as string;
    const successCase = formData.get("successCase") as string;

    await AgentRepository.update(id, {
        name,
        description,
        whatsappInstanceName,
        config: {
            provider,
            model,
            systemPrompt,
            agentRealName,
            businessName,
            marketOportunities,
            successCase,
            temperature,
            testMode,
            testNumber,
            whatsappResponse
        }
    });

    revalidatePath(`/dashboard/agents/${id}`);
    revalidatePath("/dashboard/agents");
}
