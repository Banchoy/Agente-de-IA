
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { withOrgContext } from "./base";

export const LeadRepository = {
    listByOrg: async () => {
        return await withOrgContext(async (tx) => {
            return await tx.query.leads.findMany({
                orderBy: (l: any, { desc }: any) => [desc(l.updatedAt)]
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
        // 1. Busca exata por JID nos metadados (outreachJid é o padrão para prospecção)
        let lead = await db.query.leads.findFirst({
            where: and(
                sql`metadata->>'outreachJid' = ${jid}`,
                eq(leads.organizationId, organizationId)
            )
        });
        if (lead) return lead;

        // 2. Busca por lastLid ou JID genérico nos metadados
        lead = await db.query.leads.findFirst({
            where: and(
                sql`(metadata->>'lastLid' = ${jid} OR metadata->>'jid' = ${jid})`,
                eq(leads.organizationId, organizationId)
            )
        });
        if (lead) return lead;

        // 3. Extrai o número central do JID (remove @s.whatsapp.net ou @lid)
        const phone = jid.split("@")[0];
        
        // 4. Se for um @lid, a extração de número não é confiável para busca por telefone,
        // então paramos aqui se não achamos nos metadados.
        if (jid.includes("@lid")) {
            console.log(`📡 [LeadRepository] JID ${jid} não encontrado nos metadados.`);
            return null;
        }

        // 5. Busca inteligente por sufixo (os últimos 8-9 dígitos são os mais confiáveis)
        if (phone.length >= 8) {
            const suffix = phone.slice(-8);
            lead = await db.query.leads.findFirst({
                where: and(
                    ilike(leads.phone, `%${suffix}`),
                    eq(leads.organizationId, organizationId)
                )
            });
            if (lead) {
                console.log(`🔗 [LeadRepository] Unificação via JID Suffix (${suffix}): ${lead.id}`);
                return lead;
            }
        }

        // 6. Fallback: busca resiliente padrão por telefone
        return await LeadRepository.getByPhoneSystem(phone, organizationId);
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
        
        const [newLead] = await db.insert(leads).values(data).returning();
        return newLead;
    },

    upsertSystem: async (data: typeof leads.$inferInsert) => {
        const { sql } = await import("drizzle-orm");
        const { ensureLeadsConstraints } = await import("@/lib/db/ensure-constraints");
        
        // Garante que o banco de dados tenha as constraints necessárias (Self-Healing)
        await ensureLeadsConstraints();

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
                const iaTag = await TagRepository.ensureSystemTag(updatedLead.organizationId, "IA ATIVA", "#3b82f6", "Bot");
                
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
        return await withOrgContext(async (tx) => {
            const results = await tx.insert(leads).values(data).returning();
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
