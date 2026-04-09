import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ApifyService } from "@/lib/services/apify";

// POST /api/prospecting/start - Iniciar Apify
export async function POST(req: Request) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return new NextResponse("Organization not found", { status: 404 });

        const { mapsUrl, config } = await req.json();

        if (!process.env.APIFY_API_TOKEN) {
            return NextResponse.json({ success: false, error: "Chave da API do Apify não configurada." }, { status: 400 });
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agente-de-ia-production-5eb7.up.railway.app";
        const run = await ApifyService.startGoogleMapsExtractor(mapsUrl, config, org.id, baseUrl);

        return NextResponse.json({ 
            success: true, 
            runId: run.id,
            message: "Prospecção iniciada!" 
        });

    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
