const fs = require('fs');

function sanitize(path) {
  try {
    const content = fs.readFileSync(path, 'utf8');
    // Remove BOM if present (\uFEFF)
    // Remove non-breaking space (\u00A0)
    // Remove other invisible control characters except \n, \r, \t
    const sanitized = content.replace(/\uFEFF/g, '')
                             .replace(/\u00A0/g, ' ')
                             .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    if (content !== sanitized) {
      fs.writeFileSync(path, sanitized, 'utf8');
      console.log(`Sanitized ${path}`);
    } else {
      console.log(`No bad characters detected in ${path}`);
    }
  } catch (err) {
    console.error(`Error sanitizing ${path}:`, err);
  }
}

sanitize('c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts');
sanitize('c:/Users/Armdd/TMS_ePOD/src/app/jobs/history/history-client.tsx');
