"use server";

import { db } from "@/lib/db";
import { leads } from "@saas/db";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization";
import { ResendService } from "@/lib/services/resend";
import { revalidatePath } from "next/cache";

/**
 * Busca todos os leads que possuem e-mail válido da organização.
 */
export async function getLeadsWithEmail() {
    const { orgId: clerkOrgId } = await auth();
    if (!clerkOrgId) return [];

    try {
        const org = await OrganizationRepository.getByClerkId(clerkOrgId);
        if (!org) return [];

        const result = await db.select({
            id: leads.id,
            name: leads.name,
            email: leads.email,
            phone: leads.phone,
            source: leads.source,
            metaData: leads.metaData,
            outreachStatus: leads.outreachStatus,
        })
        .from(leads)
        .where(and(
            eq(leads.organizationId, org.id),
            isNotNull(leads.email),
            sql`leads.email != ''`
        ));

        return result;
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
        if (!process.env.RESEND_API_KEY) {
            return { success: false, error: "RESEND_API_KEY não configurada no servidor." };
        }

        const html = body.replace(/\n/g, "<br/>");
        const from = fromName ? `${fromName} <onboarding@resend.dev>` : undefined;
        const result = await ResendService.sendEmail(to, subject, html, from);

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
        if (!process.env.RESEND_API_KEY) {
            return { success: false, error: "RESEND_API_KEY não configurada no servidor." };
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
                    from
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
