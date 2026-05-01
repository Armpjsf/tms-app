
const fs = require('fs');
const content = fs.readFileSync('src/app/public/invoice/[id]/page.tsx', 'utf8');

let stack = [];
let inString = false;
let stringChar = '';
let inComment = false;
let templateLiteralStack = []; 

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i+1];
    if (inComment) { if (char === '*' && next === '/') { inComment = false; i++; } continue; }
    if (inString) { if (char === stringChar) { let escapes = 0; for (let j = i-1; j >= 0; j--) { if (content[j] === '\\') escapes++; else break; } if (escapes % 2 === 0) inString = false; } continue; }
    const inTemplateLiteral = templateLiteralStack.length > 0 && templateLiteralStack[templateLiteralStack.length-1].type === 'TL';
    if (inTemplateLiteral) {
        if (char === '`') { let escapes = 0; for (let j = i-1; j >= 0; j--) { if (content[j] === '\\') escapes++; else break; } if (escapes % 2 === 0) templateLiteralStack.pop(); }
        else if (char === '$' && next === '{') { templateLiteralStack.push({ type: 'INT', line: getLine(i) }); stack.push({ char: '${', line: getLine(i) }); i++; }
        continue;
    }
    if (char === '/' && next === '*') { inComment = true; i++; continue; }
    if (char === '/' && next === '/') { while (i < content.length && content[i] !== '\n') i++; continue; }
    if (char === '"' || char === "'") { inString = true; stringChar = char; continue; }
    if (char === '`') { templateLiteralStack.push({ type: 'TL', line: getLine(i) }); continue; }
    if (char === '{') { stack.push({ char: '{', line: getLine(i) }); }
    else if (char === '}') { if (stack.length > 0) { const popped = stack.pop(); if (popped.char === '${' && templateLiteralStack.length > 0 && templateLiteralStack[templateLiteralStack.length-1].type === 'INT') { templateLiteralStack.pop(); } } }
    if (char === '(') { stack.push({ char: '(', line: getLine(i) }); }
    else if (char === ')') { if (stack.length > 0) { stack.pop(); } }
}

function getLine(pos) { return content.substring(0, pos).split('\n').length; }

if (stack.length > 0) {
    console.log("Unclosed elements:");
    stack.forEach(e => console.log(`${e.char} from line ${e.line}`));
} else if (templateLiteralStack.length > 0) {
    console.log("Unclosed template literals from line " + templateLiteralStack[0].line);
} else {
    console.log("All balanced.");
}
