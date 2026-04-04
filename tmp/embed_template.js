const fs = require('fs');
const path = require('path');

const templatePath = path.join(process.cwd(), 'src', 'lib', 'templates', 'invoice_template.xlsx');
const outputPath = path.join(process.cwd(), 'src', 'lib', 'templates', 'invoice_template_base64.ts');

if (fs.existsSync(templatePath)) {
    const b64 = fs.readFileSync(templatePath).toString('base64');
    const content = `export const INVOICE_TEMPLATE_BASE64 = "${b64}";`;
    fs.writeFileSync(outputPath, content);
    console.log('Success: Template embedded as Base64');
} else {
    console.error('Error: Template file not found at', templatePath);
}
