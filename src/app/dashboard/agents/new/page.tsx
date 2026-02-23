import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentRepository } from "@/lib/repositories/agent";
import { revalidatePath } from "next/cache";
import { Bot, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function NewAgentPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    // Action to create the agent
    async function handleSubmit(formData: FormData) {
        "use server";
        const { orgId: currentClerkOrgId } = await auth();
        if (!currentClerkOrgId) return;

        // Get the DB UUID for this organization
        const dbOrg = await db.query.organizations.findFirst({
            where: eq(organizations.clerkOrgId, currentClerkOrgId)
        });

        if (!dbOrg) {
            throw new Error("Organization not found in database.");
        }

        await AgentRepository.create({
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            organizationId: dbOrg.id,
            status: "active"
        });

        revalidatePath("/dashboard/agents");
        redirect("/dashboard/agents");
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <Link href="/dashboard/agents" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                <ArrowLeft size={16} />
                Voltar para Agentes
            </Link>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Novo Agente</h1>
                <p className="text-zinc-600">Defina as características básicas do seu novo agente de IA.</p>
            </div>

            <form action={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-zinc-900">Nome do Agente</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            placeholder="Ex: Assistente de Suporte V1"
                            required
                            className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium text-zinc-900">Descrição</label>
                        <textarea
                            name="description"
                            id="description"
                            placeholder="Descreva o propósito deste agente..."
                            rows={4}
                            className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
                        ></textarea>
                    </div>
                </div>

                <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-all active:scale-[0.98]"
                >
                    <Sparkles size={18} />
                    Criar Agente
                </button>
            </form>
        </div>
    );
}
