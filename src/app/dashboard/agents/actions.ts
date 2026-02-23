"use server";

import { auth } from "@clerk/nextjs/server";
import { AgentRepository } from "@/lib/repositories/agent";
import { revalidatePath } from "next/cache";

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

    await AgentRepository.update(id, {
        name,
        description,
        config: {
            provider,
            model,
            systemPrompt,
            temperature,
            testMode,
            testNumber
        }
    });

    revalidatePath(`/dashboard/agents/${id}`);
    revalidatePath("/dashboard/agents");
}
