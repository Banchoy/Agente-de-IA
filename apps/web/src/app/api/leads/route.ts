import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { LeadRepository } from "@/lib/repositories/lead";

// POST /api/leads - Criar lead manual
export async function POST(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const data = await req.json();
        const cleanPhone = data.phone ? String(data.phone).replace(/\D/g, "") : "";

        const newLead = await LeadRepository.create({
            ...data,
            organizationId: org.id,
            phone: cleanPhone,
            aiActive: "true"
        });

        return NextResponse.json({ success: true, lead: newLead });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
