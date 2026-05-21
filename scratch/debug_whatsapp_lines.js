const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../apps/web/src/lib/services/whatsapp.ts');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split(/\r?\n/);
let found = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('let aiContext =')) {
        console.log(`Linha ${i + 1}: ${lines[i]}`);
        console.log(`Linha ${i + 2}: ${lines[i+1]}`);
        console.log(`Linha ${i + 3}: ${lines[i+2]}`);
        console.log(`Linha ${i + 4}: ${lines[i+3]}`);
        console.log(`Linha ${i + 5}: ${lines[i+4]}`);
        console.log(`Linha ${i + 6}: ${lines[i+5]}`);
        console.log(`Linha ${i + 7}: ${lines[i+6]}`);
        console.log(`Linha ${i + 8}: ${lines[i+7]}`);
        console.log(`Linha ${i + 9}: ${lines[i+8]}`);
        console.log(`Linha ${i + 10}: ${lines[i+9]}`);
        console.log(`Linha ${i + 11}: ${lines[i+10]}`);
        console.log(`Linha ${i + 12}: ${lines[i+11]}`);
        console.log(`Linha ${i + 13}: ${lines[i+12]}`);
        console.log(`Linha ${i + 14}: ${lines[i+13]}`);
        found = true;
        break;
    }
}

if (!found) {
    console.log('Não encontrou "let aiContext =" no arquivo!');
}
