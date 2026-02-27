
"use server";

import { MetaService } from "@/lib/services/meta";
import { db } from "@/lib/db";
import { metaIntegrations, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

/**
 * Simula a conexão com o Facebook e busca formulários
 */
export async function connectMetaAccount() {
    const { userId, orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId)
    });

    if (!org) throw new Error("Organização não encontrada.");

    const internalOrgId = org.id;
    const mockToken = "EAAb...";

    // Salvar ou atualizar a integração
    await db.insert(metaIntegrations).values({
        organizationId: internalOrgId,
        accessToken: mockToken,
        webhookVerifyToken: Math.random().toString(36).substring(7)
    }).onConflictDoUpdate({
        target: metaIntegrations.organizationId,
        set: { accessToken: mockToken, updatedAt: new Date() }
    });

    // Mock de páginas que o usuário gerencia
    const pages = [
        { id: "123456789", name: "Nacional Consórcios", category: "Serviços Financeiros", image: "https://api.dicebear.com/7.x/initials/svg?seed=NC" },
        { id: "987654321", name: "Financeira Direct", category: "Investimentos", image: "https://api.dicebear.com/7.x/initials/svg?seed=FD" }
    ];

    return { success: true, pages };
}

/**
 * Busca formulários de uma página selecionada
 */
export async function getFormsForPage(pageId: string) {
    const { userId, orgId } = await auth();
    if (!orgId) throw new Error("Não autorizado");

    // Simulando delay de rede
    await new Promise(r => setTimeout(r, 800));

    const mockToken = "EAAb...";
    const forms = await MetaService.getPageForms(mockToken, pageId);
    return { success: true, forms };
}

/**
 * Ativa um formulário e inicia o Backfill de leads
 */
export async function toggleFormIntegration(formId: string, pageName: string, active: boolean) {
    const { userId, orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    // Resolve internal organization ID (UUID) from Clerk Org ID
    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId)
    });

    if (!org) throw new Error("Organização não encontrada.");

    if (active) {
        // Se ativou, disparamos o backfill usando o ID interno (UUID)
        const count = await MetaService.backfillLeads(org.id, formId, pageName);
        return { success: true, message: `${count} leads históricos importados!`, count };
    }

    return { success: true, message: "Integração desativada para este formulário." };
}
