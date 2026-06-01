
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
 * Retorna as configurações do Meta em tempo de execução.
 * Útil para evitar problemas de chaves NEXT_PUBLIC não injetadas no build.
 */
export async function getMetaConfig() {
    return {
        appId: process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    };
}

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
 * Persiste o estado do formulário no JSONB `integratedForms` de `meta_integrations`.
 */
export async function toggleFormIntegration(formId: string, pageName: string, active: boolean) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    // Buscar integração para persistir estado do formulário
    const integration = await db.query.metaIntegrations.findFirst({
        where: eq(metaIntegrations.organizationId, org.id),
    });

    // Persistir estado do formulário no JSONB
    if (integration) {
        const currentForms = (integration.integratedForms as any[]) || [];

        if (active) {
            const existingIdx = currentForms.findIndex((f: any) => f.formId === formId);
            if (existingIdx === -1) {
                currentForms.push({ formId, pageName, active: true, integratedAt: new Date().toISOString() });
            } else {
                currentForms[existingIdx].active = true;
            }
        } else {
            const existingIdx = currentForms.findIndex((f: any) => f.formId === formId);
            if (existingIdx !== -1) {
                currentForms[existingIdx].active = false;
            }
        }

        await db.update(metaIntegrations)
            .set({ integratedForms: currentForms })
            .where(eq(metaIntegrations.id, integration.id));
    }

    // Se desativando, não precisa fazer backfill
    if (!active) {
        return { success: true, message: "Integração desativada para este formulário." };
    }

    // Modo DEMO
    if (!IS_REAL_META) {
        const count = await MetaService.backfillLeadsFallback(org.id, formId, pageName);
        return { success: true, message: `${count} leads de demonstração importados!`, count };
    }

    // Modo REAL — backfill com token salvo
    if (!integration) throw new Error("Integração Meta não encontrada. Reconecte sua conta.");
    if (!integration.accessToken) throw new Error("Token de acesso não encontrado. Reconecte sua conta.");
    const count = await MetaService.backfillLeads(org.id, formId, pageName, integration.accessToken);
    return { success: true, message: `${count} leads históricos importados do Facebook!`, count };
}

/**
 * Recupera as configurações do Google Sheets da organização.
 */
export async function getGoogleSheetsConfig() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Não autorizado");

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    const config = (org.prospectingConfig as any) || {};
    return {
        success: true,
        googleSheetsUrl: config.googleSheetsUrl || "",
        googleSheetsEnabled: config.googleSheetsEnabled !== false,
        googleSheetsLastSync: config.googleSheetsLastSync || null,
        googleSheetsError: config.googleSheetsError || null
    };
}

/**
 * Salva as configurações de Google Sheets na organização.
 */
export async function saveGoogleSheetsConfig(url: string, enabled: boolean) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Não autorizado");

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    const config = (org.prospectingConfig as any) || {};
    const updatedConfig = {
        ...config,
        googleSheetsUrl: url,
        googleSheetsEnabled: enabled,
        googleSheetsError: null
    };

    await db.update(organizations)
        .set({ prospectingConfig: updatedConfig })
        .where(eq(organizations.id, org.id));

    return { success: true, message: "Configurações da planilha salvas com sucesso!" };
}

/**
 * Dispara uma sincronização imediata da planilha da organização.
 */
export async function syncGoogleSheetsNow() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Não autorizado");

    const org = await db.query.organizations.findFirst({
        where: eq(organizations.clerkOrgId, orgId),
    });
    if (!org) throw new Error("Organização não encontrada.");

    const { GoogleSheetsService } = await import("@/lib/services/google-sheets");
    const result = await GoogleSheetsService.syncOrganizationSheets(org.id);

    return result;
}


