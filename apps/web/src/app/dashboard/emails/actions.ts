"use server";

import { db } from "@/lib/db";
import { leads, organizations, users } from "@saas/db";
import { eq, and, sql, isNotNull, or, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ResendService } from "@/lib/services/resend";
import { revalidatePath } from "next/cache";
import { withOrgContext } from "@/lib/repositories/base";

/**
 * Recupera a chave de API do Resend configurada pelo usuário ou pela organização.
 * Prioridade: vendedor individual > organização global > variável de ambiente.
 */
async function getResendApiKey(): Promise<string | null> {
    const { userId, orgId: clerkOrgId } = await auth();
    if (!userId || !clerkOrgId) return process.env.RESEND_API_KEY || null;

    try {
        const org = await db.query.organizations.findFirst({
            where: eq(organizations.clerkOrgId, clerkOrgId),
            columns: { id: true, resendApiKey: true },
        });
        if (!org) return process.env.RESEND_API_KEY || null;

        const dbUser = await db.query.users.findFirst({
            where: and(
                eq(users.clerkUserId, userId),
                eq(users.organizationId, org.id)
            ),
            columns: { role: true, resendApiKey: true },
        });

        // Vendedor/member: usa chave individual se existir, senão usa da org
        if (dbUser && (dbUser.role === "vendedor" || dbUser.role === "member")) {
            return dbUser.resendApiKey || org.resendApiKey || process.env.RESEND_API_KEY || null;
        }

        // Admin/owner: usa chave da org
        return org.resendApiKey || process.env.RESEND_API_KEY || null;
    } catch (error) {
        console.error("❌ [Email] Erro ao buscar chave do Resend:", error);
        return process.env.RESEND_API_KEY || null;
    }
}

/**
 * Busca todos os leads que possuem e-mail válido da organização.
 */
export async function getLeadsWithEmail() {
    try {
        return await withOrgContext(async (tx, org, user) => {
            let result;
            if (user?.role === "member" || user?.role === "vendedor") {
                result = await tx.query.leads.findMany({
                    where: and(
                        or(
                            eq(leads.assignedUserId, user.id),
                            isNull(leads.assignedUserId)
                        ),
                        isNotNull(leads.email),
                        sql`leads.email != ''`
                    ),
                    orderBy: (l: any, { desc }: any) => [desc(l.updatedAt)]
                });
            } else {
                result = await tx.query.leads.findMany({
                    where: and(
                        isNotNull(leads.email),
                        sql`leads.email != ''`
                    ),
                    orderBy: (l: any, { desc }: any) => [desc(l.updatedAt)]
                });
            }
            return result;
        });
    } catch (error) {
        console.error("❌ [Email Actions] Erro ao buscar leads com e-mail:", error);
        return [];
    }
}

/**
 * Envia um e-mail de teste para um único destinatário.
 */
export async function sendTestEmail(to: string, subject: string, body: string, fromName?: string) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    try {
        const apiKey = await getResendApiKey();
        if (!apiKey) {
            return { success: false, error: "Nenhuma chave do Resend configurada. Vá em Configurações → Chaves de API e adicione sua Resend API Key." };
        }

        const html = body.replace(/\n/g, "<br/>");
        const from = fromName ? `${fromName} <onboarding@resend.dev>` : undefined;
        const result = await ResendService.sendEmail(to, subject, html, from, apiKey);

        return result;
    } catch (error: any) {
        console.error("❌ [Email Actions] Erro no envio de teste:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Dispara e-mails em massa para todos os leads selecionados.
 * Suporta variáveis de template: {nome}, {empresa}, {nicho}
 */
export async function sendBulkEmails(
    leadIds: string[], 
    subject: string, 
    body: string, 
    fromName?: string
) {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return { success: false, error: "Não autorizado." };

    try {
        const apiKey = await getResendApiKey();
        if (!apiKey) {
            return { success: false, error: "Nenhuma chave do Resend configurada. Vá em Configurações → Chaves de API e adicione sua Resend API Key." };
        }

        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return { success: false, error: "Organização não encontrada." };

        // Buscar leads selecionados
        const allLeads = await db.select({
            id: leads.id,
            name: leads.name,
            email: leads.email,
            metaData: leads.metaData,
        })
        .from(leads)
        .where(and(
            eq(leads.organizationId, org.id),
            isNotNull(leads.email),
            sql`leads.email != ''`
        ));

        const selectedLeads = allLeads.filter(l => leadIds.includes(l.id));

        if (selectedLeads.length === 0) {
            return { success: false, error: "Nenhum lead selecionado com e-mail válido." };
        }

        let sentCount = 0;
        let errorCount = 0;
        const from = fromName ? `${fromName} <onboarding@resend.dev>` : undefined;

        // Enviar um por um para personalizar os templates
        for (const lead of selectedLeads) {
            const meta = (lead.metaData as any) || {};
            
            // Substituir variáveis no template
            const personalizedSubject = subject
                .replace(/{nome}/gi, lead.name || "")
                .replace(/{empresa}/gi, meta.title || meta.name || "")
                .replace(/{nicho}/gi, meta.niche || "");

            const personalizedBody = body
                .replace(/{nome}/gi, lead.name || "")
                .replace(/{empresa}/gi, meta.title || meta.name || "")
                .replace(/{nicho}/gi, meta.niche || "");

            const html = personalizedBody.replace(/\n/g, "<br/>");

            try {
                const result = await ResendService.sendEmail(
                    lead.email!, 
                    personalizedSubject, 
                    html, 
                    from,
                    apiKey
                );

                if (result.success) {
                    sentCount++;
                } else {
                    errorCount++;
                    console.error(`❌ [Email] Falha ao enviar para ${lead.email}:`, result.error);
                }

                // Rate limit: aguarda 200ms entre envios para evitar throttling
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {
                errorCount++;
                console.error(`❌ [Email] Erro ao enviar para ${lead.email}:`, err);
            }
        }

        revalidatePath("/dashboard/emails");
        return { 
            success: true, 
            sent: sentCount, 
            errors: errorCount,
            total: selectedLeads.length 
        };
    } catch (error: any) {
        console.error("❌ [Email Actions] Erro no envio em massa:", error);
        return { success: false, error: error.message };
    }
}
