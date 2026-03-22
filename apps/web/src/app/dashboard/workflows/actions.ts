"use server";

import { auth } from "@clerk/nextjs/server";
import { WorkflowService } from "@/lib/services/workflow";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createWorkflow(formData: FormData) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Não autorizado");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) throw new Error("Organização não encontrada");

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    const workflow = await WorkflowService.create({
        name,
        description,
        organizationId: org.id
    });

    revalidatePath("/dashboard/workflows");
    redirect(`/dashboard/workflows/${workflow.id}`);
}

export async function updateWorkflowConfig(id: string, nodes: any[], edges: any[]) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) throw new Error("Não autorizado");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) throw new Error("Organização não encontrada");

    await WorkflowService.update(id, org.id, {
        nodes,
        edges
    });

    revalidatePath(`/dashboard/workflows/${id}`);
}
