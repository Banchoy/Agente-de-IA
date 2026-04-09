import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ApifyService } from "@/lib/services/apify";
import { LeadRepository } from "@/lib/repositories/lead";
import { normalizePhone } from "@/lib/utils/phone";

// GET /api/prospecting/progress - Polling de progresso e sync parcial
export async function GET(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const { searchParams } = new URL(req.url);
        const runId = searchParams.get("runId");
        const clientNiche = searchParams.get("niche");

        if (!runId) return new NextResponse("Run ID required", { status: 400 });

        const run = await ApifyService.getRunStatus(runId);
        if (!run) return new NextResponse("Run not found", { status: 404 });

        const items = await ApifyService.getDatasetItems(run.defaultDatasetId);
        
        // Sincronizar itens parciais no banco
        const { CRMRepository } = await import("@/lib/repositories/crm");
        const qualificationStageId = await CRMRepository.ensureDefaultPipeline(org.id);

        for (const item of items) {
            const rawPhone = item.phoneUnformatted || item.phone || item.phoneNumber || "";
            const phone = normalizePhone(rawPhone);
            const email = (item.email || "").toString().toLowerCase().trim();
            
            if (!phone && !email) continue;

            await LeadRepository.upsertSystem({
                organizationId: org.id,
                name: item.title || item.name || "Lead Maps",
                phone: phone || null,
                email: email || null,
                source: "Google Maps",
                stageId: qualificationStageId || null,
                metaData: { ...item, niche: clientNiche || "" },
                aiActive: "true"
            });
        }

        return NextResponse.json({ 
            success: true, 
            status: run.status, 
            itemCount: items.length,
            leads: items.slice(-5).map((it: any) => ({ 
                name: it.title || it.name, 
                phone: it.phone || "",
                email: it.email || ""
            }))
        });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
