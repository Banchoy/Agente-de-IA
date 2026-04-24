const fs = require('fs');
const path = require('path');

// Caminhos dos logs da brain (baseado no histórico)
const leadsLogPath = "C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\6989d9c6-2a7f-4a50-9985-10882e6727e7\\.system_generated\\steps\\378\\output.txt";
const messagesLogPath = "C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\6989d9c6-2a7f-4a50-9985-10882e6727e7\\.system_generated\\steps\\396\\output.txt";

function parseAndSave(logPath, targetName) {
    try {
        const raw = fs.readFileSync(logPath, 'utf8');
        // Extrair o JSON de dentro da string de resultado do MCP
        const match = raw.match(/<untrusted-data.*?>\s*([\s\S]*?)\s*<\/untrusted-data/);
        if (match) {
            const data = match[1];
            fs.writeFileSync(path.join(__dirname, targetName), data);
            console.log(`Salvo: ${targetName}`);
        } else {
            console.error(`Não foi possível encontrar dados no log: ${logPath}`);
        }
    } catch (err) {
        console.error(`Erro ao processar ${logPath}:`, err.message);
    }
}

parseAndSave(leadsLogPath, 'leads_archive.json');
parseAndSave(messagesLogPath, 'messages_archive.json');
