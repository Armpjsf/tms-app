const fs = require('fs');
const path = 'c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts';

try {
    const buffer = fs.readFileSync(path);
    const content = buffer.toString('utf8');
    
    // Reverse mojibake: Treat UTF-8 interpreted string as Latin1 bytes, then re-decode as UTF-8
    const fixed = Buffer.from(content, 'latin1').toString('utf8');
    
    // Very important: Check if we actually fixed something or just made it worse
    // Standard Thai start with \u0E00-\u0E7F
    if (fixed.includes('กำลังประมวลผล')) {
        fs.writeFileSync(path, fixed, 'utf8');
        console.log('Successfully restored UTF-8 encoding for dictionaries.ts');
    } else {
        console.log('Restoration verification failed. Content does not look like correct Thai.');
        // Log a sample to debug
        console.log('Sample:', fixed.substring(0, 100));
    }
} catch (err) {
    console.error('Error fixing encoding:', err);
}
