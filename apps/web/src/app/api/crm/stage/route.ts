import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { stages, pipelines, leads } from "@saas/db";
import { eq, and, asc } from "drizzle-orm";
import { OrganizationRepository } from "@/lib/repositories/organization";

// POST /api/crm/stage - Criar nova coluna
export async function POST(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const { name } = await req.json();

        const { CRMRepository } = await import("@/lib/repositories/crm");
        const pipelineId = await CRMRepository.ensureDefaultPipeline(org.id);

        const currentStages = await db.select({ order: stages.order })
            .from(stages)
            .where(eq(stages.pipelineId, pipelineId as string));
        
        const maxOrder = currentStages.reduce((max, s) => {
            const val = parseInt(s.order) || 0;
            return val > max ? val : max;
        }, 0);

        await db.insert(stages).values({
            pipelineId: pipelineId as string,
            name: name,
            order: (maxOrder + 1).toString()
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

// PATCH /api/crm/stage - Reordenar colunas
export async function PATCH(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const { stageId, newOrder } = await req.json();

        await db.update(stages)
            .set({ order: newOrder.toString() })
            .where(eq(stages.id, stageId));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

// DELETE /api/crm/stage - Excluir coluna
export async function DELETE(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const { searchParams } = new URL(req.url);
        const stageId = searchParams.get("id");

        if (!stageId) return new NextResponse("Stage ID required", { status: 400 });

        // Mover leads para a primeira coluna antes de deletar
        const allStages = await db.select({ id: stages.id })
            .from(stages)
            .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
            .where(eq(pipelines.organizationId, org.id))
            .orderBy(asc(stages.order));

        const firstStage = allStages.find(s => s.id !== stageId);
        if (firstStage) {
            await db.update(leads)
                .set({ stageId: firstStage.id })
                .where(eq(leads.stageId, stageId));
        }

        await db.delete(stages).where(eq(stages.id, stageId));
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
