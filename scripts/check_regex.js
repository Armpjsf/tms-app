
const fs = require('fs');
const content = fs.readFileSync('src/app/public/invoice/[id]/page.tsx', 'utf8');

let inString = false;
let stringChar = '';
let inRegex = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i+1];
    
    if (inString) {
        if (char === stringChar) {
            let escapes = 0;
            for (let j = i-1; j >= 0; j--) {
                if (content[j] === '\\') escapes++;
                else break;
            }
            if (escapes % 2 === 0) inString = false;
        }
        continue;
    }
    
    if (inRegex) {
        if (char === '/') {
            let escapes = 0;
            for (let j = i-1; j >= 0; j--) {
                if (content[j] === '\\') escapes++;
                else break;
            }
            if (escapes % 2 === 0) inRegex = false;
        }
        continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
    }
    
    // This is a VERY naive regex detector
    // It's hard to distinguish / (div) from / (regex) without full parsing
    // But let's look for / that are NOT closed.
}

// I'll just look at the line 396 again.
console.log("Checking line 396 surroundings...");
const lines = content.split('\n');
for (let i = 390; i < lines.length; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}
