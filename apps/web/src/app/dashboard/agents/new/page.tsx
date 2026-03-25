import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Bot, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { organizations, whatsappSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AIService } from "@/lib/services/ai";
import { AgentForm } from "@/components/agents/agent-form";

export default async function NewAgentPage() {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) redirect("/sign-in");
    if (!clerkOrgId) redirect("/org-selection");

    // Get the DB UUID and current instance for this organization
    const dbOrg = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, clerkOrgId)
    });

    if (!dbOrg) {
        redirect("/org-selection");
    }

    // Get all available sessions for this organization
    const sessions = await db.select({ 
        sessionId: whatsappSessions.sessionId 
    })
    .from(whatsappSessions)
    .where(eq(whatsappSessions.organizationId, dbOrg.id))
    .groupBy(whatsappSessions.sessionId);

    const availableSessions = sessions.map(s => s.sessionId);

    // Get dynamic free models from OpenRouter
    const freeModels = await AIService.getOpenRouterFreeModels();

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <Link href="/dashboard/agents" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                <ArrowLeft size={16} />
                Voltar para Agentes
            </Link>

            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Novo Agente</h1>
                <p className="text-muted-foreground lowercase">defina a inteligência e o comportamento do seu novo robô.</p>
            </div>

            <AgentForm 
                availableSessions={availableSessions} 
                freeModels={freeModels}
                defaultInstanceName={dbOrg.evolutionInstanceName || undefined}
            />
        </div>
    );
}
