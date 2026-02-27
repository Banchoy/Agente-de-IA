
"use server";

import { MetaService } from "@/lib/services/meta";
import { db } from "@/lib/db";
import { metaIntegrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

/**
 * Simula a conexão com o Facebook e busca formulários
 */
export async function connectMetaAccount() {
    const { userId, orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    // Em uma implementação real, o Token viria do OAuth
    const mockToken = "EAAb...";
    const mockPageId = "123456789";

    // Salvar ou atualizar a integração no banco
    const existing = await db.query.metaIntegrations.findFirst({
        where: eq(metaIntegrations.organizationId, orgId)
    });

    if (existing) {
        await db.update(metaIntegrations)
            .set({ accessToken: mockToken, updatedAt: new Date() } as any)
            .where(eq(metaIntegrations.organizationId, orgId));
    } else {
        await db.insert(metaIntegrations).values({
            organizationId: orgId,
            accessToken: mockToken,
            webhookVerifyToken: Math.random().toString(36).substring(7)
        });
    }

    const forms = await MetaService.getPageForms(mockToken, mockPageId);
    return { success: true, forms };
}

/**
 * Ativa um formulário e inicia o Backfill de leads
 */
export async function toggleFormIntegration(formId: string, pageName: string, active: boolean) {
    const { userId, orgId } = await auth();
    if (!orgId) throw new Error("Organização não selecionada");

    if (active) {
        // Se ativou, disparamos o backfill
        const count = await MetaService.backfillLeads(orgId, formId, pageName);
        return { success: true, message: `${count} leads históricos importados!`, count };
    }

    return { success: true, message: "Integração desativada para este formulário." };
}
