import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { EvolutionService } from "@/lib/services/evolution";

export async function GET() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org || !org.evolutionApiUrl || !org.evolutionApiKey || !org.evolutionInstanceName) {
        return NextResponse.json({ status: "disconnected" });
    }

    try {
        const instances = await EvolutionService.getInstances(org.evolutionApiUrl, org.evolutionApiKey);
        const me = instances.find((i: any) => i.instanceName === org.evolutionInstanceName);

        const status = me?.status || "disconnected";

        // Auto-update status in DB if changed
        if (status !== org.evolutionInstanceStatus) {
            await OrganizationRepository.update(org.id, {
                evolutionInstanceStatus: status
            });
        }

        return NextResponse.json({ status });
    } catch (e) {
        return NextResponse.json({ status: "error" });
    }
}
