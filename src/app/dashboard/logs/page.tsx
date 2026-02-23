import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { History, FileText, Clock, User } from "lucide-react";

export default async function AuditLogsPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    const org = await OrganizationRepository.getByClerkId(clerkOrgId);
    if (!org) redirect("/org-selection");

    const logs = await db.query.auditLogs.findMany({
        where: eq(auditLogs.organizationId, org.id),
        orderBy: [desc(auditLogs.createdAt)],
        limit: 50
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Logs de Auditoria</h1>
                <p className="text-zinc-600">Monitore todas as ações realizadas na sua organização.</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900">Eventos Recentes</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock size={14} />
                        Últimas 24 horas
                    </div>
                </div>

                <div className="divide-y divide-zinc-100">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-zinc-400">
                            <History size={40} className="mx-auto mb-4 opacity-20" />
                            <p>Nenhum log de auditoria encontrado ainda.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-zinc-50 transition-colors">
                                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-bold text-zinc-900 truncate uppercase tracking-wider text-xs">{log.action}</p>
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                            <User size={12} />
                                            Sistema
                                        </div>
                                        {log.metadata && (
                                            <div className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded font-mono text-zinc-500 truncate max-w-sm">
                                                {JSON.stringify(log.metadata)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
