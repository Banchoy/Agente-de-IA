
import { db } from "@/lib/db";
import { leads, metaIntegrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class MetaService {
    /**
     * Busca todos os formulários de uma página do Facebook
     * (Simulando chamada para /{page-id}/leadgen_forms)
     */
    static async getPageForms(accessToken: string, pageId: string) {
        console.log(`Buscando formulários para Page ID: ${pageId}...`);

        // Mock de resposta da API do Facebook
        return [
            { id: "1029384756", name: "Formulário de Cadastro - Consórcio Imobiliário", status: "active" },
            { id: "2837465910", name: "Simulação de Crédito Auto", status: "active" },
            { id: "9182736455", name: "Interesse Verão 2026", status: "inactive" },
        ];
    }

    /**
     * Realiza o "Backfill" de leads de um formulário específico.
     * Busca todos os leads desde a criação do formulário.
     * (Simulando chamada para /{form-id}/leads)
     */
    static async backfillLeads(organizationId: string, formId: string, pageName: string) {
        console.log(`Iniciando Backfill para o formulário ${formId} da organização ${organizationId}...`);

        // Em uma implementação real, faríamos um loop paginado na API do Facebook:
        // GET /v21.0/{form-id}/leads?access_token={token}&fields=id,created_time,field_data

        // Mock de leads históricos para teste
        const mockHistoricalLeads = [
            { id: `fb_${formId}_1`, name: "Ricardo Almeida", email: "ricardo@exemplo.com", phone: "+5511988887777", created: "2026-02-10T10:00:00Z" },
            { id: `fb_${formId}_2`, name: "Juliana Costa", email: "juliana@exemplo.com", phone: "+5511977776666", created: "2026-02-15T14:30:00Z" },
            { id: `fb_${formId}_3`, name: "Marcos Oliveira", email: "marcos@exemplo.com", phone: "+5511966665555", created: "2026-02-20T09:15:00Z" },
        ];

        let count = 0;
        for (const fbLead of mockHistoricalLeads) {
            // Verificar se o lead já existe para evitar duplicatas (usando o ID do Facebook no metaData)
            // Para simplicidade desse mock, apenas inserimos

            await db.insert(leads).values({
                organizationId,
                name: fbLead.name,
                email: fbLead.email,
                phone: fbLead.phone,
                source: `Meta: ${pageName}`,
                status: "active",
                stageId: null, // Cairá na primeira etapa do Kanban (Prospecção)
                createdAt: new Date(fbLead.created),
                metaData: {
                    facebook_lead_id: fbLead.id,
                    form_id: formId,
                    integrated_at: new Date().toISOString(),
                    sync_type: "backfill"
                }
            });
            count++;
        }

        return count;
    }
}
