import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function inspectFile(filename: string) {
    const filePath = path.join(process.cwd(), 'public', 'templates', filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`--- Inspection of ${filename} ---`);
    console.log(`Sheet Name: ${sheetName}`);
    
    // Print rows 25-45 to find footer
    console.log(`--- Footer Area of ${filename} ---`);
    for (let i = 24; i < Math.min(data.length as number, 45); i++) {
        console.log(`Row ${i + 1}:`, (data as any[])[i]);
    }
    console.log('\n');
}

inspectFile('invoice_template_per_unit.xlsx');
inspectFile('invoice_template_lump_sum.xlsx');
