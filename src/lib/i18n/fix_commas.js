const fs = require('fs');
const content = fs.readFileSync('c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts', 'utf8');

// Pattern: closing brace, optional spaces, newline, spaces, property name, colon
// Replace with: brace, COMMA, newline...
const fixed = content.replace(/(})(\r?\n\s+\w+:)/g, '$1,$2')
                     .replace(/(})(\r?\n\s+})(\r?\n\s+\w+:)/g, '$1,$2$3')
                     .replace(/(})(\r?\n\s+})(\r?\n\s+})/g, '$1,$2$3');

// Wait! I'll do a simpler, safer one.
// We only want to add a comma if it's missing between two properties.
// Example: } \n shipment: { -> }, \n shipment: {
const saferFixed = content.split('\n').map((line, i, lines) => {
    const nextLine = lines[i+1] || '';
    if (line.trim() === '}' && nextLine.trim().includes(': {') && !line.includes(',')) {
        return line + ',';
    }
    return line;
}).join('\n');

fs.writeFileSync('c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts', saferFixed);
console.log('Fixed potential missing commas in dictionaries.ts');
