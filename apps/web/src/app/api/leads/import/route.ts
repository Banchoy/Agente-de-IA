import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { LeadRepository } from "@/lib/repositories/lead";

// POST /api/leads/import - Importação em massa
export async function POST(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const { leadsData } = await req.json();

        const leadsToInsert = leadsData.map((data: any) => {
            const cleanPhone = data.phone ? String(data.phone).replace(/\D/g, "") : "";
            return {
                organizationId: org.id,
                name: data.name || "Lead Importado",
                phone: cleanPhone,
                email: data.email || "",
                stageId: data.stageId || "prospecting",
                source: data.source || "Importação",
                metaData: data.metaData || {},
                aiActive: "true"
            };
        });

        await LeadRepository.createMany(leadsToInsert);
        
        return NextResponse.json({ success: true, count: leadsToInsert.length });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
