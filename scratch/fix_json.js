const fs = require('fs');

function unescapeJSON(file) {
    let raw = fs.readFileSync(file, 'utf8');
    try {
        JSON.parse(raw);
        console.log(`${file} is already valid.`);
    } catch(e) {
        // First try to parse it as a JSON string literal if it's double serialized
        try {
            let inner = JSON.parse('"' + raw.replace(/"/g, '\\"') + '"'); // if it's raw text with unescaped slashes?
            // Actually, if it's just raw `[{\"id...` we need to replace `\"` with `"`
            let fixed = raw.replace(/\\"/g, '"');
            // Check if it starts with "[" or "{" and finishes with "]" or "}"
            if (fixed.startsWith('"[') && fixed.endsWith(']"')) {
                fixed = fixed.substring(1, fixed.length - 1);
            }
            if (fixed.startsWith('"[{') && fixed.endsWith('}]"')) {
                fixed = fixed.substring(1, fixed.length - 1);
            }
            JSON.parse(fixed); // Validate
            fs.writeFileSync(file, fixed);
            console.log(`Fixou ${file}!`);
        } catch(err2) {
            console.error(`Falha ao tentar deserializar ${file}:`, err2.message);
        }
    }
}

unescapeJSON('scratch/leads_archive.json');
unescapeJSON('scratch/messages_archive.json');
