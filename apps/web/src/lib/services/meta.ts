import { db } from "@/lib/db";
import { leads, metaIntegrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaService {
    /**
     * Busca formulários de lead reais de uma página do Facebook
     * GET /{page-id}/leadgen_forms
     */
    static async getPageForms(accessToken: string, pageId: string) {
        const url = `${GRAPH_BASE}/${pageId}/leadgen_forms?` +
            new URLSearchParams({
                access_token: accessToken,
                fields: "id,name,status,leads_count,created_time",
                limit: "50",
            });

        const res = await fetch(url, { next: { revalidate: 0 } });
        const data = await res.json();

        if (data.error) {
            console.error("Erro ao buscar formulários:", data.error);
            throw new Error(data.error.message || "Erro ao buscar formulários do Facebook");
        }

        return (data.data || []).map((form: any) => ({
            id: form.id,
            name: form.name,
            status: form.status === "ACTIVE" ? "active" : "inactive",
            leadsCount: form.leads_count || 0,
            createdAt: form.created_time,
        }));
    }

    /**
     * Busca leads reais de um formulário (com paginação)
     * GET /{form-id}/leads
     */
    static async getLeads(accessToken: string, formId: string, limit = 100) {
        const results: any[] = [];
        let url: string | null = `${GRAPH_BASE}/${formId}/leads?` +
            new URLSearchParams({
                access_token: accessToken,
                fields: "id,created_time,field_data",
                limit: String(limit),
            });

        // Loop de paginação  
        while (url) {
            const res = await fetch(url, { next: { revalidate: 0 } });
            const data = await res.json();

            if (data.error) {
                console.error("Erro ao buscar leads:", data.error);
                break;
            }

            results.push(...(data.data || []));
            url = data.paging?.next || null;

            // Limite de segurança: máximo 10 páginas de paginação
            if (results.length >= 1000) break;
        }

        return results;
    }

    /**
     * Converte os field_data do Facebook para um objeto simples
     */
    static parseLeadFields(fieldData: Array<{ name: string; values: string[] }>) {
        const map: Record<string, string> = {};
        for (const field of fieldData) {
            map[field.name] = field.values[0] || "";
        }
        return map;
    }

    /**
     * Faz o backfill real: busca TODOS os leads de um formulário e salva no BD
     */
    static async backfillLeads(organizationId: string, formId: string, pageName: string, accessToken: string) {
        console.log(`[MetaService] Backfill: form ${formId}, org ${organizationId}`);

        const fbLeads = await this.getLeads(accessToken, formId);
        let count = 0;

        for (const fbLead of fbLeads) {
            const fields = this.parseLeadFields(fbLead.field_data || []);

            const name =
                `${fields.first_name || ""} ${fields.last_name || ""}`.trim() ||
                fields.full_name ||
                fields.nome ||
                "Lead sem nome";

            const email = fields.email || fields.e_mail || null;
            const phone =
                fields.phone_number ||
                fields.phone ||
                fields.whatsapp ||
                fields.telefone ||
                fields.celular ||
                null;

            // Evitar duplicatas pelo facebook_lead_id
            try {
                await db.insert(leads).values({
                    organizationId,
                    name,
                    email,
                    phone,
                    source: `Meta: ${pageName}`,
                    status: "active",
                    stageId: null,
                    createdAt: new Date(fbLead.created_time),
                    metaData: {
                        facebook_lead_id: fbLead.id,
                        form_id: formId,
                        integrated_at: new Date().toISOString(),
                        sync_type: "backfill",
                        raw_fields: fields,
                    },
                });
                count++;
            } catch (err: any) {
                // Ignorar duplicatas (unique constraint violation)
                if (!err.message?.includes("duplicate") && !err.constraint) {
                    console.error("Erro ao inserir lead:", err.message);
                }
            }
        }

        console.log(`[MetaService] Backfill concluído: ${count} leads importados`);
        return count;
    }

    /**
     * Retorna demo data quando as variáveis de ambiente não estão configuradas
     */
    static async getPageFormsFallback(_accessToken: string, _pageId: string) {
        return [
            { id: "demo_1", name: "Formulário de Cadastro - Consórcio Imobiliário", status: "active", leadsCount: 47 },
            { id: "demo_2", name: "Simulação de Crédito Auto", status: "active", leadsCount: 23 },
            { id: "demo_3", name: "Interesse Verão 2026", status: "inactive", leadsCount: 5 },
        ];
    }

    static async backfillLeadsFallback(organizationId: string, formId: string, pageName: string) {
        const mockLeads = [
            { id: `fb_${formId}_1`, name: "Ricardo Almeida", email: "ricardo@exemplo.com", phone: "+5511988887777", created: "2026-02-10T10:00:00Z" },
            { id: `fb_${formId}_2`, name: "Juliana Costa", email: "juliana@exemplo.com", phone: "+5511977776666", created: "2026-02-15T14:30:00Z" },
            { id: `fb_${formId}_3`, name: "Marcos Oliveira", email: "marcos@exemplo.com", phone: "+5511966665555", created: "2026-02-20T09:15:00Z" },
        ];

        let count = 0;
        for (const l of mockLeads) {
            await db.insert(leads).values({
                organizationId,
                name: l.name,
                email: l.email,
                phone: l.phone,
                source: `Meta: ${pageName}`,
                status: "active",
                stageId: null,
                createdAt: new Date(l.created),
                metaData: { facebook_lead_id: l.id, form_id: formId, sync_type: "backfill_demo" },
            });
            count++;
        }
        return count;
    }
}
