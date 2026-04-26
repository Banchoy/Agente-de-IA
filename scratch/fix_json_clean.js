const fs = require('fs');

function decodeJsonFile(filename) {
    try {
        let raw = fs.readFileSync(filename, 'utf8');
        // The MCP output serialized " as \" and newlines as literal \n characters inside the file.
        // We can JSON.parse an artificially quoted string to use the V8 engine's unescaping.
        // But since the raw text may have unescaped quotes itself, it's simpler to string-replace back.
        let fixed = raw.replace(/\\"/g, '"');
        fixed = fixed.replace(/\\\\/g, '\\');
        // But what if it's already fixed? Let's just try to parse the fixed string.
        let obj = JSON.parse(fixed);
        // Save the properly formatted JSON
        fs.writeFileSync(filename, JSON.stringify(obj, null, 2));
        console.log(`Success: ${filename}`);
    } catch (e) {
        console.error(`Error processing ${filename}:`, e.message);
    }
}

decodeJsonFile('scratch/leads_archive.json');
decodeJsonFile('scratch/messages_archive.json');
