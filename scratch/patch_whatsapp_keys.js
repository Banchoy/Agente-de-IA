const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../apps/web/src/lib/services/whatsapp.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                                const aiContext = {
                                    openaiApiKey: (org as any).openaiApiKey,
                                    geminiApiKey: (org as any).geminiApiKey,
                                    openrouterApiKey: (org as any).openrouterApiKey,
                                };`;

const replacementStr = `                                let aiContext = {
                                    openaiApiKey: (org as any).openaiApiKey,
                                    geminiApiKey: (org as any).geminiApiKey,
                                    openrouterApiKey: (org as any).openrouterApiKey,
                                };

                                if (lead && lead.assignedUserId) {
                                    const seller = await db.query.users.findFirst({
                                        where: eq(users.id, lead.assignedUserId)
                                    });
                                    if (seller) {
                                        console.log(\`🔑 [Baileys] Resolvendo chaves de API para o vendedor \${seller.id}...\`);
                                        if (seller.openaiApiKey) aiContext.openaiApiKey = seller.openaiApiKey;
                                        if (seller.geminiApiKey) aiContext.geminiApiKey = seller.geminiApiKey;
                                        if (seller.openrouterApiKey) aiContext.openrouterApiKey = seller.openrouterApiKey;
                                    }
                                }`;

// Fazer o replace independente do formato de quebra de linha do sistema (\r\n vs \n)
const contentNormalized = content.replace(/\r\n/g, '\n');
const targetNormalized = targetStr.replace(/\r\n/g, '\n');
const replacementNormalized = replacementStr.replace(/\r\n/g, '\n');

if (contentNormalized.includes(targetNormalized)) {
    const updatedNormalized = contentNormalized.replace(targetNormalized, replacementNormalized);
    
    // Gravar de volta preservando o formato de quebra de linha original (\r\n se for o caso)
    const hasCrLf = content.includes('\r\n');
    fs.writeFileSync(filePath, hasCrLf ? updatedNormalized.replace(/\n/g, '\r\n') : updatedNormalized, 'utf8');
    console.log('✅ Chaves de API atualizadas com sucesso e quebras de linha preservadas!');
} else {
    console.error('❌ Não conseguiu encontrar a string alvo mesmo normalizada!');
}
