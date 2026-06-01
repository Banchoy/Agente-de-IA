import { db } from "@/lib/db";
import { leads, stages, pipelines, organizations } from "@/lib/db/schema";
import { eq, and, asc, isNull, sql } from "drizzle-orm";
import Papa from "papaparse";

export function extractSpreadsheetId(url: string): { id: string; gid: string | null } | null {
    if (!url) return null;
    
    // Suporta links completos e encurtados
    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) return null;
    
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    return {
        id: idMatch[1],
        gid: gidMatch ? gidMatch[1] : null
    };
}

export class GoogleSheetsService {
    /**
     * Sincroniza os leads de uma única organização usando as configurações salvas em prospectingConfig
     */
    static async syncOrganizationSheets(orgId: string): Promise<{ success: boolean; importedCount: number; error?: string }> {
        console.log(`📊 [Google Sheets Sync] Iniciando sincronização para Org ID: ${orgId}`);
        
        try {
            // 1. Obter organização e suas configurações
            const org = await db.query.organizations.findFirst({
                where: eq(organizations.id, orgId),
            });
            
            if (!org) {
                return { success: false, importedCount: 0, error: "Organização não encontrada." };
            }
            
            const config = (org.prospectingConfig as any) || {};
            const { googleSheetsUrl, googleSheetsEnabled } = config;
            
            if (!googleSheetsUrl) {
                return { success: false, importedCount: 0, error: "Nenhuma URL de planilha configurada." };
            }
            
            if (googleSheetsEnabled === false) {
                return { success: false, importedCount: 0, error: "Integração do Google Sheets desabilitada." };
            }
            
            // 2. Extrair ID e GID da planilha
            const sheetInfo = extractSpreadsheetId(googleSheetsUrl);
            if (!sheetInfo) {
                return { success: false, importedCount: 0, error: "URL do Google Sheets inválida." };
            }
            
            // 3. Montar a URL de exportação em CSV
            let exportUrl = `https://docs.google.com/spreadsheets/d/${sheetInfo.id}/export?format=csv`;
            if (sheetInfo.gid) {
                exportUrl += `&gid=${sheetInfo.gid}`;
            }
            
            // 4. Buscar o CSV da planilha pública
            const res = await fetch(exportUrl, { 
                method: "GET",
                headers: { "Accept": "text/csv" },
                next: { revalidate: 0 } // Desabilitar cache para buscar sempre em tempo real
            });
            
            if (!res.ok) {
                return { 
                    success: false, 
                    importedCount: 0, 
                    error: "Erro ao acessar planilha. Verifique se o compartilhamento está ativo para 'Qualquer pessoa com o link' em modo Leitor ou Editor." 
                };
            }
            
            const csvText = await res.text();
            
            // 5. Parsear o CSV usando Papa.parse
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false
            });
            
            const rows = parsed.data as any[];
            if (!rows || rows.length === 0) {
                return { success: true, importedCount: 0 };
            }
            
            // 6. Buscar o primeiro estágio (Novo Lead) da organização
            const firstStage = await db.select({ id: stages.id })
                .from(stages)
                .innerJoin(pipelines, eq(stages.pipelineId, pipelines.id))
                .where(eq(pipelines.organizationId, orgId))
                .orderBy(asc(stages.order))
                .limit(1);
            
            const stageId = firstStage[0]?.id || null;
            
            let importedCount = 0;
            
            // 7. Processar cada linha de forma segura
            for (const row of rows) {
                // Mapeamento dinâmico e flexível de colunas comuns
                const name = row.full_name || row.nome || row.name || row["Nome Completo"] || row["Nome"] || "Lead Planilha";
                const phone = row.phone_number || row.phone || row.telefone || row["WhatsApp"] || row["Telefone"] || row.whatsapp || "";
                const email = row.email || row["E-mail"] || row.mail || row.email_address || row.correo || "";
                const sourceField = row.campaign_name || row.ad_name || row.origem || row.source || row["Origem"] || null;
                
                // Normalizações
                const cleanPhone = phone ? String(phone).replace(/\D/g, "") : "";
                const cleanEmail = email ? String(email).trim().toLowerCase() : "";
                
                if (!cleanPhone && !cleanEmail) continue;
                
                // Prevenir duplicidade na mesma organização
                let alreadyExists = false;
                
                if (cleanPhone) {
                    const existingByPhone = await db.query.leads.findFirst({
                        where: and(
                            eq(leads.organizationId, orgId),
                            eq(leads.phone, cleanPhone)
                        )
                    });
                    if (existingByPhone) alreadyExists = true;
                }
                
                if (!alreadyExists && cleanEmail) {
                    const existingByEmail = await db.query.leads.findFirst({
                        where: and(
                            eq(leads.organizationId, orgId),
                            eq(leads.email, cleanEmail)
                        )
                    });
                    if (existingByEmail) alreadyExists = true;
                }
                
                if (alreadyExists) continue;
                
                // Determinar origem do lead
                const sheetName = sourceField ? String(sourceField).trim() : "Planilha Google";
                const source = `Google Sheets: ${sheetName}`;
                
                // Inserir lead no banco
                await db.insert(leads).values({
                    organizationId: orgId,
                    name: String(name).trim() || "Lead Planilha",
                    email: cleanEmail || null,
                    phone: cleanPhone || null,
                    source,
                    status: "active", // Marca como ativo para aparecer o badge "Sem Contato"
                    stageId,
                    metaData: {
                        ...row,
                        imported_via: "google_sheets_sync",
                        synced_at: new Date().toISOString(),
                    }
                });
                
                importedCount++;
            }
            
            // 8. Atualizar o timestamp de última sincronização no prospectingConfig
            const updatedConfig = {
                ...config,
                googleSheetsLastSync: new Date().toISOString(),
                googleSheetsError: null
            };
            
            await db.update(organizations)
                .set({ prospectingConfig: updatedConfig })
                .where(eq(organizations.id, orgId));
            
            console.log(`✅ [Google Sheets Sync] Concluído para Org ID: ${orgId}. Novos leads importados: ${importedCount}`);
            return { success: true, importedCount };
            
        } catch (err: any) {
            console.error(`❌ [Google Sheets Sync] Falha geral ao sincronizar Org ID: ${orgId}:`, err);
            
            // Atualizar o erro no config se a org puder ser recuperada
            try {
                const org = await db.query.organizations.findFirst({
                    where: eq(organizations.id, orgId),
                });
                if (org) {
                    const config = (org.prospectingConfig as any) || {};
                    await db.update(organizations)
                        .set({ 
                            prospectingConfig: {
                                ...config,
                                googleSheetsError: err.message || "Erro desconhecido na sincronização."
                            } 
                        })
                        .where(eq(organizations.id, orgId));
                }
            } catch {}
            
            return { success: false, importedCount: 0, error: err.message || "Erro desconhecido." };
        }
    }

    /**
     * Sincroniza todas as organizações que possuem integração com Google Sheets ativa
     */
    static async syncAllOrganizations(): Promise<{ processedOrgs: number; totalImported: number }> {
        console.log("⏰ [Google Sheets Job] Iniciando varredura global de planilhas...");
        let processedOrgs = 0;
        let totalImported = 0;
        
        try {
            // Buscar todas as organizações
            const allOrgs = await db.query.organizations.findMany();
            
            for (const org of allOrgs) {
                const config = (org.prospectingConfig as any) || {};
                const { googleSheetsUrl, googleSheetsEnabled } = config;
                
                if (googleSheetsUrl && googleSheetsEnabled !== false) {
                    processedOrgs++;
                    const result = await this.syncOrganizationSheets(org.id);
                    if (result.success) {
                        totalImported += result.importedCount;
                    }
                }
            }
            
            console.log(`🏁 [Google Sheets Job] Varredura global encerrada. Organizações ativas processadas: ${processedOrgs} | Total leads importados: ${totalImported}`);
        } catch (err) {
            console.error("❌ [Google Sheets Job] Erro ao listar organizações para sync global:", err);
        }
        
        return { processedOrgs, totalImported };
    }
}
