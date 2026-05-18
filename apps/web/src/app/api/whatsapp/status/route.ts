import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { WhatsappService } from "@/lib/services/whatsapp";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const org = await OrganizationRepository.getByClerkId(orgId);
        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const dbUser = await db.query.users.findFirst({
            where: and(
                eq(users.clerkUserId, userId),
                eq(users.organizationId, org.id)
            )
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const sessionId = `wa_${dbUser.id.split('-')[0]}`;
        const session = WhatsappService.sessions.get(sessionId);

        console.log(`🔍 [API WhatsApp Status] Buscando sessão do vendedor: ${sessionId} | Encontrada: ${!!session} | Status: ${session?.status || "disconnected"}`);

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
