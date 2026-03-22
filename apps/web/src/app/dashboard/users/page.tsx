import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Users, Mail, Shield, Calendar } from "lucide-react";

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
                    <p className="text-zinc-600">Gerencie os membros da sua organização.</p>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Papel</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Data de Entrada</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {members.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                                    Nenhum usuário encontrado.
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white">
                                                {member.clerkUserId.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900">ID: {member.clerkUserId}</p>
                                                <p className="text-xs text-zinc-500 truncate max-w-[150px]">Sincronizado via Clerk</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100 uppercase">
                                            <Shield size={10} />
                                            {member.role || "Membro"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-zinc-400" />
                                            {new Date(member.createdAt).toLocaleDateString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-zinc-400">
                                        <button className="text-xs font-bold text-zinc-900 hover:underline">
                                            Gerenciar no Clerk
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="rounded-xl bg-blue-50 p-6 flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Users size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900">Controle de Acesso</h4>
                    <p className="text-sm text-blue-700">
                        Para convidar novos membros, use o **Portal da Organização** do Clerk. Os novos usuários serão sincronizados automaticamente assim que acessarem o dashboard pela primeira vez.
                    </p>
                </div>
            </div>
        </div>
    );
}
