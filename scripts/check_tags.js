
const fs = require('fs');
const content = fs.readFileSync('src/app/public/invoice/[id]/page.tsx', 'utf8');

const lines = content.split('\n');
let open = 0;
let close = 0;

lines.forEach((line, i) => {
    const o = (line.match(/<div/g) || []).length;
    const c = (line.match(/<\/div>/g) || []).length;
    open += o;
    close += c;
    console.log(`Line ${i+1}: Open ${open}, Close ${close} | Balance: ${open - close} | Content: ${line.trim().substring(0, 50)}`);
});
