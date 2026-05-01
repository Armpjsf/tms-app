
const fs = require('fs');
const content = fs.readFileSync('src/app/public/invoice/[id]/page.tsx', 'utf8');

function countBraces(str) {
    let open = 0;
    let close = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inString) {
            if (char === stringChar) {
                let escapes = 0;
                for (let j = i-1; j >= 0; j--) {
                    if (str[j] === '\\') escapes++;
                    else break;
                }
                if (escapes % 2 === 0) inString = false;
            }
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
            continue;
        }
        if (char === '{') open++;
        if (char === '}') close++;
    }
    return { open, close };
}

console.log(countBraces(content));
