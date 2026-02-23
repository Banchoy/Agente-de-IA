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
            status: "active",
            config: {
                provider: formData.get("provider") as string,
                model: formData.get("model") as string,
                systemPrompt: formData.get("systemPrompt") as string
            }
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
                <p className="text-zinc-600">Defina a inteligência e o comportamento do seu novo agente.</p>
            </div>

            <form action={handleSubmit} className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-zinc-900">Nome do Agente</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                placeholder="Ex: Atendente de Vendas"
                                required
                                className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium text-zinc-900">Descrição</label>
                            <input
                                type="text"
                                name="description"
                                id="description"
                                placeholder="Breve resumo da função do agente"
                                className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <hr className="border-zinc-100" />

                    {/* AI Config */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="provider" className="text-sm font-medium text-zinc-900">Provedor de IA</label>
                            <select
                                name="provider"
                                id="provider"
                                required
                                className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none bg-white transition-all"
                            >
                                <option value="google">Google Gemini</option>
                                <option value="openai">OpenAI (v2 em breve)</option>
                                <option value="anthropic">Anthropic (v2 em breve)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="model" className="text-sm font-medium text-zinc-900">Modelo</label>
                            <select
                                name="model"
                                id="model"
                                required
                                className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-900 focus:outline-none bg-white transition-all"
                            >
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Inteligente)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="systemPrompt" className="text-sm font-medium text-zinc-900">Prompt do Sistema (Personalidade)</label>
                        <textarea
                            name="systemPrompt"
                            id="systemPrompt"
                            placeholder="Ex: Você é um atendente simpático de uma barbearia..."
                            rows={5}
                            required
                            className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none transition-all resize-none"
                        ></textarea>
                        <p className="text-[11px] text-zinc-500">Instrua o agente sobre como ele deve se comportar e quais informações deve fornecer.</p>
                    </div>
                </div>

                <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-all active:scale-[0.98]"
                >
                    <Sparkles size={18} />
                    Criar Agente de IA
                </button>
            </form>
        </div>
    );
}
