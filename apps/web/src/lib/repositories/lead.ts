
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, or, isNull, ilike, sql } from "drizzle-orm";
import { withOrgContext } from "./base";

export const LeadRepository = {
    listByOrg: async () => {
        return await withOrgContext(async (tx, org, user) => {
            // Se for vendedor/membro, só vê os próprios leads E os leads sem atribuição (fila inicial de prospecção)
            if (user?.role === "member" || user?.role === "vendedor") {
                return await tx.query.leads.findMany({
                    where: or(
                        eq(leads.assignedUserId, user.id),
                        isNull(leads.assignedUserId)
                    ),
                    orderBy: (l: any, { desc }: any) => [desc(l.updatedAt)],
                    with: { assignedUser: true }
                });
            }
            // Admin vê tudo da organização (RLS cuida de filtrar por org)
            return await tx.query.leads.findMany({
                orderBy: (l: any, { desc }: any) => [desc(l.updatedAt)],
                with: { assignedUser: true }
            });
        });
    },

    getById: async (id: string) => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findFirst({
                where: eq(leads.id, id)
            });
        });
    },

    getByPhone: async (phone: string) => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findFirst({
                where: eq(leads.phone, phone)
            });
        });
    },

    getByIdSystem: async (id: string) => {
        return await db.query.leads.findFirst({
            where: eq(leads.id, id)
        });
    },

    getByPhoneSystem: async (phone: string, organizationId: string) => {
        // 1. Sanitização rigorosa do telefone de entrada
        const cleanPhone = phone.replace(/\D/g, "");
        if (!cleanPhone) return null;
        
        console.log(`🔍 [LeadRepository] Buscando lead: ${cleanPhone} na Org: ${organizationId}`);

        // 2. Tenta busca exata com o número limpo
        let lead = await db.query.leads.findFirst({
            where: and(
                eq(leads.phone, cleanPhone),
                eq(leads.organizationId, organizationId)
            )
        });

        if (lead) return lead;

        // 3. Busca Resiliente para Números do Brasil (Divergência de 9º dígito / Prefixo 55)
        // Se o número tem '55' na frente, vamos tentar também a versão sem o '55'
        if (cleanPhone.startsWith("55")) {
            const no55 = cleanPhone.substring(2);
            lead = await db.query.leads.findFirst({
                where: and(eq(leads.phone, no55), eq(leads.organizationId, organizationId))
            });
            if (lead) return lead;
        } else if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
            // Se não tem 55, mas parece um número com DDD (10 ou 11 dígitos), tenta com 55
            const with55 = `55${cleanPhone}`;
            lead = await db.query.leads.findFirst({
                where: and(eq(leads.phone, with55), eq(leads.organizationId, organizationId))
            });
            if (lead) return lead;
        }

        // 4. Lógica para resolver divergências de 9º dígito (DDD + 8 ou 9 dígitos)
        if (cleanPhone.startsWith("55") && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
            const ddd = cleanPhone.substring(2, 4);
            const body = cleanPhone.substring(4);
            
            let alternativePhone: string | null = null;
            if (cleanPhone.length === 13 && body.startsWith("9")) {
                alternativePhone = `55${ddd}${body.substring(1)}`;
            } else if (cleanPhone.length === 12) {
                alternativePhone = `55${ddd}9${body}`;
            }

            if (alternativePhone) {
                console.log(`🔍 [LeadRepository] Tentando busca alternativa (9º dígito): ${alternativePhone}`);
                lead = await db.query.leads.findFirst({
                    where: and(eq(leads.phone, alternativePhone), eq(leads.organizationId, organizationId))
                });
                if (lead) return lead;
            }
        }

        // 6. BUSCA POR JID (Metadados): Para contatos vindos de prospecção
        // Tenta encontrar o lead que tenha esse JID exato gravado nos seus metadados
        const jid = `${cleanPhone}@s.whatsapp.net`;
        lead = await db.query.leads.findFirst({
            where: and(
                sql`metadata->>'outreachJid' = ${jid}`,
                eq(leads.organizationId, organizationId)
            )
        });
        if (lead) return lead;

        return lead;
    },

    getByJidSystem: async (jid: string, organizationId: string) => {
        console.log(`🔍 [LeadRepository] Iniciando busca por JID: ${jid} na Org: ${organizationId}`);
        
        // 1. Busca exata por JID nos metadados (outreachJid ou jid ou lastLid)
        let lead = await db.query.leads.findFirst({
            where: and(
                sql`(metadata->>'outreachJid' = ${jid} OR metadata->>'jid' = ${jid} OR metadata->>'lastLid' = ${jid})`,
                eq(leads.organizationId, organizationId)
            )
        });

        // 1.1 SE NÃO ACHOU NA ATIVA, BUSCAR NO ARCHIVE (Postgres)
        if (!lead) {
            console.log(`📂 [LeadRepository] JID ${jid} não encontrado na ativa. Buscando no Arquivo...`);
            
            try {
                // Usamos sql raw aqui porque o schema.ts pode não ter o leads_archive mapeado no query builder
                const archivedLeads = await db.execute(sql`
                    SELECT * FROM leads_archive 
                    WHERE (meta_data->>'outreachJid' = ${jid} OR meta_data->>'jid' = ${jid} OR meta_data->>'lastLid' = ${jid})
                    AND organization_id = ${organizationId}
                    LIMIT 1
                `);

                const rows = Array.isArray(archivedLeads) 
                    ? archivedLeads 
                    : (archivedLeads as any).rows || [];
                const archivedLead = rows[0] as any;

                if (archivedLead) {
                    console.log(`♻️ [LeadRepository] Lead encontrado no arquivo! Restaurando: ${archivedLead.name}`);
                    // Restaura o lead para a ativa (Mapeamento básico)
                    const [restored] = await db.insert(leads).values({
                        id: archivedLead.id,
                        organizationId: archivedLead.organization_id,
                        phone: archivedLead.phone,
                        name: archivedLead.name,
                        status: archivedLead.status || "NEW",
                        metaData: archivedLead.meta_data || {},
                        createdAt: archivedLead.created_at || new Date(),
                        updatedAt: new Date(),
                        outreachStatus: "completed" // Se estava no arquivo, a prospecção já foi
                    } as any).returning();
                    
                    lead = restored;
                    // Opcional: Deletar do arquivo (limpeza)
                    await db.execute(sql`DELETE FROM leads_archive WHERE id = ${archivedLead.id}`);
                }
            } catch (archiveErr) {
                console.warn(`⚠️ [LeadRepository] Tabela leads_archive não disponível no DB principal. Continuando busca normal.`);
            }
        }

        if (lead) {
            console.log(`✅ [LeadRepository] Lead encontrado por JID: ${lead.id}`);
            return lead;
        }

        // 2. Extrai o número do JID (Ex: 55419... ou @lid)
        const phoneFromJid = jid.split("@")[0].replace(/\D/g, "");
        
        // 3. Se o "número" extraído do JID tiver cara de telefone (>= 10 dígitos)
        if (phoneFromJid.length >= 10) {
            console.log(`🔍 [LeadRepository] JID parece conter um número: ${phoneFromJid}. Buscando variações...`);
            lead = await LeadRepository.getByPhoneSystem(phoneFromJid, organizationId);
            
            if (lead) {
                console.log(`✅ [LeadRepository] Lead unificado por telefone: ${lead.id}. Atualizando JID.`);
                // Unifica o JID para futuras buscas rápidas
                const newMetadata = { ...(lead.metaData as any || {}), lastLid: jid };
                if (jid.includes('@s.whatsapp.net')) newMetadata.outreachJid = jid;
                
                await db.update(leads)
                    .set({ metaData: newMetadata })
                    .where(eq(leads.id, lead.id));
                    
                return lead;
            }
        }

        return null;
    },


    getByPhoneSuffixSystem: async (phone: string, organizationId: string, suffixLength: number = 8) => {
        const clean = phone.replace(/\D/g, "");
        if (clean.length < suffixLength) return null;
        const suffix = clean.slice(-suffixLength);
        
        console.log(`🔍 [LeadRepository] Suffix Match: Buscando por *${suffix} na Org: ${organizationId}`);
        
        return await db.query.leads.findFirst({
            where: and(
                ilike(leads.phone, `%${suffix}`),
                eq(leads.organizationId, organizationId)
            ),
            orderBy: (l: any, { desc }: any) => [desc(l.createdAt)]
        });
    },

    create: async (data: typeof leads.$inferInsert) => {
        return await withOrgContext(async (tx) => {
            const [newLead] = await tx.insert(leads).values(data).returning();
            return newLead;
        });
    },

    createSystem: async (data: typeof leads.$inferInsert) => {
        const { ensureLeadsConstraints } = await import("@/lib/db/ensure-constraints");
        await ensureLeadsConstraints();
        
        if (!data.assignedUserId && data.organizationId) {
            const { RoutingService } = await import("@/lib/services/routing");
            const leadType = (data.metaData as any)?.leadType || data.source || undefined;
            const assignedUserId = await RoutingService.assignNextUser(data.organizationId, leadType);
            if (assignedUserId) {
                data.assignedUserId = assignedUserId;
            }
        }
        
        const [newLead] = await db.insert(leads).values(data).returning();
        return newLead;
    },

    upsertSystem: async (data: typeof leads.$inferInsert) => {
        const { sql } = await import("drizzle-orm");
        const { ensureLeadsConstraints } = await import("@/lib/db/ensure-constraints");
        
        // Garante que o banco de dados tenha as constraints necessárias (Self-Healing)
        await ensureLeadsConstraints();

        if (!data.assignedUserId && data.organizationId) {
            const { RoutingService } = await import("@/lib/services/routing");
            const leadType = (data.metaData as any)?.leadType || data.source || undefined;
            const assignedUserId = await RoutingService.assignNextUser(data.organizationId, leadType);
            if (assignedUserId) {
                data.assignedUserId = assignedUserId;
            }
        }

        if (data.phone) {
            // Priority: Phone
            const [lead] = await db.insert(leads)
                .values(data)
                .onConflictDoUpdate({
                    target: [leads.phone, leads.organizationId],
                    set: {
                        name: data.name,
                        email: data.email || sql`leads.email`,
                        stageId: data.stageId || sql`leads.stage_id`,
                        metaData: data.metaData,
                        updatedAt: new Date()
                    }
                })
                .returning();
            
            if (lead) {
                console.log(`✅ [LeadRepository] Lead upsertado por telefone: ${lead.name} [ID: ${lead.id}]`);
            }
            return lead;
        } else if (data.email) {
            // Fallback: Email
            const [lead] = await db.insert(leads)
                .values(data)
                .onConflictDoUpdate({
                    target: [leads.email, leads.organizationId],
                    set: {
                        name: data.name,
                        stageId: data.stageId || sql`leads.stage_id`,
                        metaData: data.metaData,
                        updatedAt: new Date()
                    }
                })
                .returning();
            
            if (lead) {
                console.log(`✅ [LeadRepository] Lead upsertado por e-mail: ${lead.name} [ID: ${lead.id}]`);
            }
            return lead;
        }
        
        // Se não tiver nenhum dos dois, apenas insere
        const [newLead] = await db.insert(leads).values(data).returning();
        return newLead;
    },

    updateSystem: async (id: string, data: Partial<typeof leads.$inferInsert>) => {
        // 1. Busca o estado atual para o merge de metadados
        const current = await db.query.leads.findFirst({
            where: eq(leads.id, id)
        });

        const currentMetadata = (current?.metaData as any) || {};
        const newMetadata = (data.metaData as any) || {};

        // 2. Trava de Contexto: Não sobrescrever Nicho/Nome real com placeholders genéricos da IA
        const mergedMetadata = { ...currentMetadata };
        
        for (const [key, value] of Object.entries(newMetadata)) {
            if (value === null) {
                // Suporte para REMOÇÃO de chaves se passado explicitamente null
                delete mergedMetadata[key];
                continue;
            }

            const lowValue = String(value).toLowerCase();
            const isGeneric = lowValue.includes("seu negócio") || lowValue.includes("desconhecido") || !value;
            
            if (isGeneric && mergedMetadata[key]) {
                // Se o novo valor for genérico e já temos algo bom, IGNORA o novo
                continue;
            }
            mergedMetadata[key] = value;
        }

        const [updatedLead] = await db.update(leads)
            .set({ 
                ...data, 
                metaData: mergedMetadata,
                updatedAt: new Date() 
            })
            .where(eq(leads.id, id))
            .returning();
        
        // 3. Sincronização Automática de Etiquetas de Sistema (ex: IA ATIVA)
        if (updatedLead && (data.aiActive !== undefined || data.metaData !== undefined)) {
            try {
                const { TagRepository } = await import("./tag");
                const aiActive = updatedLead.aiActive === "true";
                const iaTag = await TagRepository.ensureSystemTag(updatedLead.organizationId, "IA ATIVA", "#22c55e", "Bot");
                
                if (aiActive) {
                    await TagRepository.assignToLead(updatedLead.id, iaTag.id);
                } else {
                    await TagRepository.removeFromLead(updatedLead.id, iaTag.id);
                }
            } catch (err) {
                console.warn(`⚠️ [LeadRepository] Falha na sincronização da tag IA:`, err);
            }
        }

        return updatedLead;
    },

    createMany: async (data: (typeof leads.$inferInsert)[]) => {
        // Desduplicar os leads na memória com base em telefone e organizationId
        // O Postgres não permite linhas duplicadas no mesmo lote de INSERT ON CONFLICT
        const uniqueDataMap = new Map<string, typeof leads.$inferInsert>();
        
        for (const lead of data) {
            const key = `${lead.phone}_${lead.organizationId}`;
            uniqueDataMap.set(key, lead);
        }
        
        const deduplicatedData = Array.from(uniqueDataMap.values());

        if (deduplicatedData.length === 0) return [];

        // Apply Roleta (Routing) for bulk insert
        const { RoutingService } = await import("@/lib/services/routing");
        for (const lead of deduplicatedData) {
            if (!lead.assignedUserId && lead.organizationId) {
                const leadType = (lead.metaData as any)?.leadType || lead.source || undefined;
                const assignedUserId = await RoutingService.assignNextUser(lead.organizationId, leadType);
                if (assignedUserId) {
                    lead.assignedUserId = assignedUserId;
                }
            }
        }

        return await withOrgContext(async (tx) => {
            const results = await tx.insert(leads)
                .values(deduplicatedData)
                .onConflictDoUpdate({
                    target: [leads.phone, leads.organizationId],
                    set: {
                        name: sql`EXCLUDED.name`,
                        email: sql`EXCLUDED.email`,
                        metaData: sql`leads.metadata || EXCLUDED.metadata`,
                        updatedAt: new Date()
                    }
                })
                .returning();
            return results;
        });
    },

    update: async (id: string, data: Partial<typeof leads.$inferInsert>) => {
        return await withOrgContext(async (tx) => {
            const [updatedLead] = await tx.update(leads)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(leads.id, id))
                .returning();
            return updatedLead || null;
        });
    },

    delete: async (id: string) => {
        return await withOrgContext(async (tx) => {
            await tx.delete(leads).where(eq(leads.id, id));
        });
    },

    getInactiveLeads: async (days: number) => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - days);

        // Busca leads sem atualização há X dias
        return await db.query.leads.findMany({
            where: (l: any, { lt }: any) => lt(l.updatedAt, threshold),
            limit: 100
        });
    },

    deleteSystem: async (id: string) => {
        await db.delete(leads).where(eq(leads.id, id));
    },

    getAnalyticsStats: async (organizationId: string) => {
        const { sql } = await import("drizzle-orm");
        
        // 1. Leads por Estágio
        const stageStats = await db
            .select({
                stageId: leads.stageId,
                count: sql<number>`count(*)`
            })
            .from(leads)
            .where(eq(leads.organizationId, organizationId))
            .groupBy(leads.stageId);

        // 2. Leads nos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isoDateStr = sevenDaysAgo.toISOString();
        
        const last7Days = await db
            .select({
                date: sql<string>`DATE(created_at)`,
                count: sql<number>`count(*)`
            })
            .from(leads)
            .where(and(
                eq(leads.organizationId, organizationId),
                sql`created_at >= ${isoDateStr}`
            ))
            .groupBy(sql`DATE(created_at)`)
            .orderBy(sql`DATE(created_at)`);

        // 3. Totais rápidos
        const [totals] = await db
            .select({
                total: sql<number>`count(*)`,
                today: sql<number>`count(*) filter (where created_at >= CURRENT_DATE)`,
                converted: sql<number>`count(*) filter (where stage_id in (select id from stages where name ilike '%vendido%'))`
            })
            .from(leads)
            .where(eq(leads.organizationId, organizationId));

        return {
            stageStats,
            last7Days,
            totals: {
                total: Number(totals?.total || 0),
                today: Number(totals?.today || 0),
                converted: Number(totals?.converted || 0)
            }
        };
    }
};
