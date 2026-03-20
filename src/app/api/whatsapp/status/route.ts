import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { WhatsappService } from "@/lib/services/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { orgId } = await auth();
        if (!orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const org = await OrganizationRepository.getByClerkId(orgId);
        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const sessionId = `wa_${org.id.split('-')[0]}`;
        const session = WhatsappService.getSession(sessionId);

        return NextResponse.json({
            status: session?.status || "disconnected",
            qr: session?.qr || null,
            instanceName: sessionId
        });
    } catch (error) {
        console.error("[WhatsApp Status Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
