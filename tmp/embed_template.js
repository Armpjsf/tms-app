const fs = require('fs');
const path = require('path');

const inputPath = 'public/templates/invoice_template.xlsx';
const outputPath = 'src/lib/templates/invoice_template_base64.ts';

try {
  const buffer = fs.readFileSync(inputPath);
  const base64 = buffer.toString('base64');
  
  // Chunk the string into lines of 100 chars
  const chunks = [];
  for (let i = 0; i < base64.length; i += 100) {
    chunks.push(base64.substring(i, i + 100));
  }
  
  const content = `export const INVOICE_TEMPLATE_BASE64 = \n  '${chunks.join("' + \n  '")}'\n;`;
  
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log('Template embedded successfully in ' + outputPath);
} catch (err) {
  console.error('Error embedding template:', err);
  process.exit(1);
}
创新
