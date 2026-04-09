import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { OrganizationRepository } from "@/lib/repositories/organization";

export async function GET() {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const [pendingResult] = await db.select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(and(eq(leads.organizationId, org.id), eq(leads.outreachStatus, "pending")));

        const [completedResult] = await db.select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(and(
                eq(leads.organizationId, org.id), 
                eq(leads.outreachStatus, "completed"),
                sql`last_outreach_at > now() - interval '24 hours'`
            ));

        const pending = Number(pendingResult?.count || 0);
        const completed = Number(completedResult?.count || 0);
        const total = pending + completed;
        
        return NextResponse.json({
            active: pending > 0,
            pending,
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        });
    } catch (error: any) {
        console.error("❌ [API Outreach Status] Erro:", error);
        return new NextResponse(error.message || "Internal Server Error", { status: 500 });
    }
}
