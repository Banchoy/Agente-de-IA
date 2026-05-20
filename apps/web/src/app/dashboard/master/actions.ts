"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { 
    organizations, 
    users, 
    leads, 
    messages, 
    messageTags, 
    leadTags, 
    whatsappSessions, 
    agents, 
    workflows, 
    stages, 
    pipelines, 
    metaIntegrations, 
    auditLogs, 
    tags 
} from "@/lib/db/schema";
import { eq, desc, inArray, sql, and } from "drizzle-orm";
import { WhatsappService } from "@/lib/services/whatsapp";
import { revalidatePath } from "next/cache";

// Clerk ID do usuário master (Bruno Gustavo)
const MASTER_USER_ID = "user_39Wu4TqDSEQWIhZbsTmyw5WmWfM";

async function validateMasterAccess() {
    const { userId, orgId } = await auth();
    
    let isMaster = userId === MASTER_USER_ID;
    if (!isMaster && userId && orgId) {
        const dbOrg = await db.query.organizations.findFirst({
            where: eq(organizations.clerkOrgId, orgId)
        });
        if (dbOrg) {
            const dbUser = await db.query.users.findFirst({
                where: and(eq(users.clerkUserId, userId), eq(users.organizationId, dbOrg.id))
            });
            if (dbUser?.role === "master") {
                isMaster = true;
            }
        }
    }
    
    if (!isMaster) {
        throw new Error("Acesso negado. Apenas o usuário master pode executar esta ação.");
    }
}

/**
 * Obtém os detalhes de leads e membros de uma organização específica.
 */
export async function getOrgDetailsAction(orgId: string) {
    try {
        await validateMasterAccess();

        // Buscar leads da organização ordenados pelos mais recentes
        const orgLeads = await db.query.leads.findMany({
            where: eq(leads.organizationId, orgId),
            orderBy: [desc(leads.createdAt)],
            limit: 100 // limitar a 100 para evitar sobrecarga visual
        });

        // Buscar membros/vendedores cadastrados na organização
        const orgUsers = await db.query.users.findMany({
            where: eq(users.organizationId, orgId),
            orderBy: [desc(users.createdAt)]
        });

        return {
            success: true,
            leads: orgLeads.map(l => ({
                id: l.id,
                name: l.name,
                phone: l.phone,
                aiActive: l.aiActive,
                source: l.source || "Não especificado",
                createdAt: l.createdAt.toISOString()
            })),
            users: orgUsers.map(u => ({
                id: u.id,
                role: u.role || "vendedor",
                clerkUserId: u.clerkUserId,
                createdAt: u.createdAt.toISOString()
            }))
        };
    } catch (error: any) {
        console.error("❌ Erro ao buscar detalhes da organização:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Deleta fisicamente uma organização e encerra suas instâncias ativas do WhatsApp em memória.
 * Deleta explicitamente todos os registros dependentes para evitar erros de chaves estrangeiras.
 */
export async function deleteOrgAction(orgId: string) {
    try {
        await validateMasterAccess();

        console.log(`⚠️ [Master Action] Iniciando processo de deleção para a organização: ${orgId}`);

        // 1. Localizar todos os usuários vinculados à organização
        const orgUsers = await db.select()
            .from(users)
            .where(eq(users.organizationId, orgId));

        // 2. Encerrar sessões de WhatsApp em memória para os usuários encontrados
        for (const user of orgUsers) {
            const sessionId = `wa_${user.id.split('-')[0]}`;
            const session = WhatsappService.sessions.get(sessionId);

            if (session) {
                console.log(`🔌 [Master Action] Desconectando sessão ativa ${sessionId} da memória.`);
                if (session.heartbeat) {
                    clearInterval(session.heartbeat);
                }
                if (session.sock) {
                    try {
                        await session.sock.logout();
                    } catch (e) {
                        console.warn(`[Master Action] Falha ao efetuar logout de ${sessionId}:`, e);
                    }
                }
                WhatsappService.sessions.delete(sessionId);
                if (WhatsappService.connectionPromises.has(sessionId)) {
                    WhatsappService.connectionPromises.delete(sessionId);
                }
            }
        }

        console.log(`🧹 [Master Action] Iniciando deleção explícita de registros filhos para evitar conflitos de FK.`);

        // A. Deletar message_tags e messages usando subqueries para máxima velocidade
        try {
            await db.delete(messageTags).where(
                inArray(
                    messageTags.messageId,
                    db.select({ id: messages.id }).from(messages).where(eq(messages.organizationId, orgId))
                )
            );
            await db.delete(messages).where(eq(messages.organizationId, orgId));
            console.log(`- Limpou mensagens e suas tags.`);
        } catch (e: any) {
            console.warn(`[Master Action] Falha/ignorado ao limpar mensagens:`, e.message);
        }

        // B. Deletar lead_tags e leads usando subqueries para máxima velocidade
        try {
            await db.delete(leadTags).where(
                inArray(
                    leadTags.leadId,
                    db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, orgId))
                )
            );
            await db.delete(leads).where(eq(leads.organizationId, orgId));
            console.log(`- Limpou leads e suas tags.`);
        } catch (e: any) {
            console.warn(`[Master Action] Falha/ignorado ao limpar leads:`, e.message);
        }

        // C. Deletar do leads_archive (caso a tabela física exista)
        try {
            await db.execute(sql`DELETE FROM leads_archive WHERE organization_id = ${orgId}::uuid`);
            console.log(`- Limpou histórico de leads em leads_archive.`);
        } catch (e: any) {
            console.log(`[Master Action] Tabela leads_archive não limpa ou não existe:`, e.message);
        }

        // D. Deletar whatsapp_sessions
        await db.delete(whatsappSessions).where(eq(whatsappSessions.organizationId, orgId));

        // E. Deletar agents
        await db.delete(agents).where(eq(agents.organizationId, orgId));

        // F. Deletar workflows
        await db.delete(workflows).where(eq(workflows.organizationId, orgId));

        // G. Deletar stages e pipelines usando subqueries para máxima velocidade
        try {
            await db.delete(stages).where(
                inArray(
                    stages.pipelineId,
                    db.select({ id: pipelines.id }).from(pipelines).where(eq(pipelines.organizationId, orgId))
                )
            );
            await db.delete(pipelines).where(eq(pipelines.organizationId, orgId));
            console.log(`- Limpou pipelines e estágios.`);
        } catch (e: any) {
            console.warn(`[Master Action] Falha/ignorado ao limpar pipelines:`, e.message);
        }

        // H. Deletar meta_integrations
        await db.delete(metaIntegrations).where(eq(metaIntegrations.organizationId, orgId));

        // I. Deletar audit_logs
        await db.delete(auditLogs).where(eq(auditLogs.organizationId, orgId));

        // J. Deletar tags
        await db.delete(tags).where(eq(tags.organizationId, orgId));

        // K. Deletar users
        await db.delete(users).where(eq(users.organizationId, orgId));
        console.log(`- Limpou usuários cadastrados.`);

        // L. Deletar a organização principal
        await db.delete(organizations).where(eq(organizations.id, orgId));

        console.log(`✅ [Master Action] Organização ${orgId} e dados associados deletados com sucesso do banco de dados.`);

        revalidatePath("/dashboard/master");
        return { success: true };
    } catch (error: any) {
        console.error("❌ Erro ao deletar organização:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Atualiza a role de um usuário/membro de forma segura.
 */
export async function updateUserRoleAction(userId: string, newRole: string) {
    try {
        await validateMasterAccess();

        console.log(`⚠️ [Master Action] Atualizando role do usuário ${userId} para: ${newRole}`);

        // Validar se a role está dentro das permitidas
        const allowedRoles = ["master", "admin", "admin_test", "vendedor", "vendedor_test"];
        if (!allowedRoles.includes(newRole)) {
            throw new Error(`Role inválida: ${newRole}`);
        }

        // Atualizar no banco de dados
        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, userId));

        console.log(`✅ [Master Action] Role do usuário ${userId} atualizada com sucesso para ${newRole}.`);

        revalidatePath("/dashboard/master");
        return { success: true };
    } catch (error: any) {
        console.error("❌ Erro ao atualizar role do usuário:", error.message);
        return { success: false, error: error.message };
    }
}

