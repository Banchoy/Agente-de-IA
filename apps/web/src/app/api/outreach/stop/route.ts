import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { OrganizationRepository } from "@/lib/repositories/organization";

export async function POST() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        console.log(`🛑 [API Outreach Stop] Interrompendo disparos para Org: ${org.id}`);

        await db.update(leads)
            .set({ outreachStatus: "idle" })
            .where(and(
                eq(leads.organizationId, org.id),
                inArray(leads.outreachStatus, ["pending", "processing"])
            ));
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ [API Outreach Stop] Erro:", error);
        return new NextResponse(error.message || "Internal Server Error", { status: 500 });
    }
}
