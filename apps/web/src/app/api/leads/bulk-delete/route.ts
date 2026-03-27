import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { OrganizationRepository } from "@/lib/repositories/organization";

export async function DELETE(req: Request) {
    try {
        const { userId, orgId: clerkOrgId } = await auth();
        if (!userId || !clerkOrgId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) {
            return new NextResponse("Organization not found", { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const stageId = searchParams.get("stageId");

        if (!stageId) {
            return new NextResponse("Stage ID is required", { status: 400 });
        }

        console.log(`🗑️ [API] Deletando leads da org ${org.id} no estágio ${stageId}`);

        await db.delete(leads)
            .where(
                and(
                    eq(leads.organizationId, org.id),
                    eq(leads.stageId, stageId)
                )
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ [API] Erro ao deletar leads:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
