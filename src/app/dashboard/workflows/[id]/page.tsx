import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { WorkflowService } from "@/lib/services/workflow";
import { OrganizationRepository } from "@/lib/repositories/organization";
import WorkflowBuilder from "../WorkflowBuilder";

export default async function WorkflowEditorPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) redirect("/sign-in");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    const workflow = await WorkflowService.getById(id, org.id);
    if (!workflow) notFound();

    return (
        <div className="h-[calc(100vh-160px)] -m-6 h-[calc(100vh-64px)] overflow-hidden">
            <WorkflowBuilder workflow={workflow} />
        </div>
    );
}
