const fs = require('fs');
const content = fs.readFileSync('c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts', 'utf8');

// The error is '}', followed by newline and property name, without a comma.
// Finding: } \n property: {
// Replacing with: }, \n property: {
const fixedContent = content.replace(/(\n\s+})(\n\s+\w+:\s*\{)/g, '$1,$2');

if (content !== fixedContent) {
    fs.writeFileSync('c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts', fixedContent);
    console.log('Successfully fixed missing commas in dictionaries.ts');
} else {
    console.log('No missing commas detected by regex');
}
