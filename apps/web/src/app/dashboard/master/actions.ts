"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { organizations, users, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { WhatsappService } from "@/lib/services/whatsapp";
import { revalidatePath } from "next/cache";

// Clerk ID do usuário master (Bruno Gustavo)
const MASTER_USER_ID = "user_39Wu4TqDSEQWIhZbsTmyw5WmWfM";

async function validateMasterAccess() {
    const { userId } = await auth();
    if (userId !== MASTER_USER_ID) {
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
                        console.warn(`[Master Action] Falha ao efetuar logout ordenado de ${sessionId}:`, e);
                    }
                }
                WhatsappService.sessions.delete(sessionId);
                if (WhatsappService.connectionPromises.has(sessionId)) {
                    WhatsappService.connectionPromises.delete(sessionId);
                }
            }
        }

        // 3. Deletar a organização física do banco
        // O onDelete: "cascade" nas tabelas dependentes removerá automaticamente todos os registros no banco
        await db.delete(organizations)
            .where(eq(organizations.id, orgId));

        console.log(`✅ [Master Action] Organização ${orgId} e dados associados deletados com sucesso.`);

        revalidatePath("/dashboard/master");
        return { success: true };
    } catch (error: any) {
        console.error("❌ Erro ao deletar organização:", error.message);
        return { success: false, error: error.message };
    }
}
