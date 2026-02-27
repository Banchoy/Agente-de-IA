
"use server";

import { MetaService } from "@/lib/services/meta";
import { db } from "@/lib/db";
import { metaIntegrations, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

const IS_REAL_META = !!(process.env.META_APP_ID && process.env.META_APP_SECRET);

console.log("🔍 Diagnóstico Backend (Actions):");
console.log("- META_APP_ID presente:", !!process.env.META_APP_ID);
console.log("- META_APP_SECRET presente:", !!process.env.META_APP_SECRET);
console.log("- IS_REAL_META:", IS_REAL_META);

/**
 * Chamado APÓS o callback OAuth.
 * Recebe o token já válido que foi salvo pela rota de callback,
 * e retorna as páginas passadas via query string (já resolvidas no callback).
 * No modo demo, gera dados fictícios.
 */
export async function connectMetaAccount(longLivedToken?: string, pagesFromCallback?: any[]) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    console.log("🚀 [connectMetaAccount] Iniciando...");
    console.log("- IS_REAL_META:", IS_REAL_META);
    console.log("- META_APP_ID:", process.env.META_APP_ID);

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    // Modo DEMO (variáveis de env não configuradas)
    if (!IS_REAL_META) {
        const mockToken = "DEMO_TOKEN";
        await db.insert(metaIntegrations).values({
            organizationId: org.id,
            accessToken: mockToken,
            webhookVerifyToken: Math.random().toString(36).substring(7),
        }).onConflictDoUpdate({
            target: metaIntegrations.organizationId,
            set: { accessToken: mockToken },
        });

        const pages = [
            { id: "123456789", name: "Nacional Consórcios", category: "Serviços Financeiros", image: "https://api.dicebear.com/7.x/initials/svg?seed=NC" },
            { id: "987654321", name: "Financeira Direct", category: "Investimentos", image: "https://api.dicebear.com/7.x/initials/svg?seed=FD" },
        ];
        return { success: true, pages, mode: "demo" };
    }

    // Modo REAL — token já foi salvo pelo callback, apenas retornar as páginas
    return { success: true, pages: pagesFromCallback || [], mode: "real" };
}

/**
 * Busca formulários de uma página.
 * Modo real: chama a Graph API usando o token salvo no banco.
 * Modo demo: retorna dados fictícios.
 */
export async function getFormsForPage(pageId: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Não autorizado");

    if (!IS_REAL_META) {
        await new Promise(r => setTimeout(r, 600));
        const forms = await MetaService.getPageFormsFallback("", pageId);
        return { success: true, forms };
    }

    // Buscar o token do banco
    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    const integration = await db.query.metaIntegrations.findFirst({
        where: eq(metaIntegrations.organizationId, org.id),
    });
    if (!integration) throw new Error("Integração Meta não encontrada. Reconecte sua conta.");

    if (!integration.accessToken) throw new Error("Token de acesso não encontrado. Reconecte sua conta.");
    const forms = await MetaService.getPageForms(integration.accessToken, pageId);
    return { success: true, forms };
}

/**
 * Ativa/desativa um formulário e opcionalmente faz o backfill de leads históricos.
 */
export async function toggleFormIntegration(formId: string, pageName: string, active: boolean) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    if (!active) {
        return { success: true, message: "Integração desativada para este formulário." };
    }

    if (!IS_REAL_META) {
        const count = await MetaService.backfillLeadsFallback(org.id, formId, pageName);
        return { success: true, message: `${count} leads de demonstração importados!`, count };
    }

    // Buscar token real
    const integration = await db.query.metaIntegrations.findFirst({
        where: eq(metaIntegrations.organizationId, org.id),
    });
    if (!integration) throw new Error("Integração Meta não encontrada. Reconecte sua conta.");

    if (!integration.accessToken) throw new Error("Token de acesso não encontrado. Reconecte sua conta.");
    const count = await MetaService.backfillLeads(org.id, formId, pageName, integration.accessToken);
    return { success: true, message: `${count} leads históricos importados do Facebook!`, count };
}
