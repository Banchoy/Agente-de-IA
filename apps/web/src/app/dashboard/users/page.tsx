import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import UsersManagerClient from "./UsersManagerClient";

export default async function UsersPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    const members = await db.query.users.findMany({
        where: eq(usersTable.organizationId, org.id),
        orderBy: (users, { desc }) => [desc(users.createdAt)]
    });

    const client = await clerkClient();
    let clerkMembers: any[] = [];
    try {
        const response = await client.organizations.getOrganizationMembershipList({
            organizationId: clerkOrgId,
        });
        clerkMembers = response.data;
    } catch (e) {
        console.error("Erro ao buscar membros no Clerk:", e);
    }

    const enrichedMembers = members.map(member => {
        const clerkMember = clerkMembers.find(m => m.publicUserData?.userId === member.clerkUserId);
        return {
            ...member,
            name: clerkMember 
                ? `${clerkMember.publicUserData.firstName || ""} ${clerkMember.publicUserData.lastName || ""}`.trim() || clerkMember.publicUserData.identifier 
                : "Usuário Sem Nome",
            email: clerkMember ? clerkMember.publicUserData.identifier : "Sem E-mail",
            imageUrl: clerkMember ? clerkMember.publicUserData.imageUrl : null,
            clerkRole: clerkMember ? clerkMember.role : null,
        };
    });

    // Encontra a role do usuário atual logado
    const dbUser = await db.query.users.findFirst({
        where: and(
            eq(usersTable.clerkUserId, userId),
            eq(usersTable.organizationId, org.id)
        )
    });
    const currentUserRole = dbUser?.role || "vendedor";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Usuários</h1>
                    <p className="text-zinc-600">Gerencie os membros da sua organização e regras da roleta.</p>
                </div>
            </div>

            <UsersManagerClient 
                members={enrichedMembers} 
                orgId={org.id} 
                initialRoutingConfig={org.routingConfig} 
                currentUserRole={currentUserRole}
                orgPlanId={org.planId}
            />
        </div>
    );
}

