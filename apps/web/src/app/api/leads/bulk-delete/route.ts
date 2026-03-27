import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
            console.warn(`⚠️ [API] Tentativa de bulk-delete sem stageId para org ${org.id}`);
            return new NextResponse("Stage ID is required", { status: 400 });
        }

        console.log(`🗑️ [API] Iniciando deleção em massa. Org: ${org.id}, Estágio: ${stageId}`);

        // Deleção robusta: Considera stageId "null" como leads sem estágio definido
        const deleteCriteria = stageId === "null" 
            ? and(eq(leads.organizationId, org.id), isNull(leads.stageId))
            : and(eq(leads.organizationId, org.id), eq(leads.stageId, stageId));

        const result = await db.delete(leads).where(deleteCriteria).returning();

        console.log(`✅ [API] Bulk-delete concluído. ${result.length} leads removidos.`);

        return NextResponse.json({ success: true, count: result.length });
    } catch (error) {
        console.error("❌ [API] Erro ao deletar leads:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
