import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Usuários</h1>
                    <p className="text-zinc-600">Gerencie os membros da sua organização e regras da roleta.</p>
                </div>
            </div>

            <UsersManagerClient 
                members={members} 
                orgId={org.id} 
                initialRoutingConfig={org.routingConfig} 
            />
        </div>
    );
}
