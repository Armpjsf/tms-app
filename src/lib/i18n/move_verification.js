const fs = require('fs');
const path = 'c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts';

let content = fs.readFileSync(path, 'utf8');

// Function to move 'verification' out of 'jobs' for a specific language section
function moveVerificationForSection(lang) {
    // 1. Identify the 'jobs' object for this language
    // We look for 'jobs: {' starting with 6 spaces (TH) or 4 spaces (EN)
    const jobsStartPattern = lang === 'th' ? /\n\s{6}jobs:\s*\{/ : /\n\s{4}jobs:\s*\{/;
    const jobsStartIndex = content.search(jobsStartPattern);
    if (jobsStartIndex === -1) {
        console.log(`Could not find jobs for ${lang}`);
        return;
    }

    // 2. Extract verification block
    // It's currently inside jobs. We search for it.
    const verPattern = /\s{8}verification:\s*\{[\s\S]*?\n\s{8}\},?/;
    const verMatch = content.substring(jobsStartIndex).match(verPattern);
    if (!verMatch) {
        console.log(`Could not find verification inside jobs for ${lang}`);
        return;
    }

    const verBlock = verMatch[0];
    const absoluteVerIndex = jobsStartIndex + verMatch.index;

    // 3. Remove verification block from jobs
    // Also remove the trailing comma if it was there
    content = content.substring(0, absoluteVerIndex) + content.substring(absoluteVerIndex + verBlock.length);

    // 4. Find the end of 'jobs'
    // For TH, jobs ends with '      },' (6 spaces)
    // For EN, jobs ends with '    },' (4 spaces)
    const jobsEndPattern = lang === 'th' ? /\n\s{6}\},/ : /\n\s{4}\},/;
    const jobsEndMatch = content.substring(jobsStartIndex).match(jobsEndPattern);
    if (!jobsEndMatch) {
         console.log(`Could not find end of jobs for ${lang}`);
         return;
    }
    const absoluteJobsEndIndex = jobsStartIndex + jobsEndMatch.index + jobsEndMatch[0].length;

    // 5. Insert verification after jobs
    // Adjust indentation to match (6 spaces for TH, 4 for EN)
    const targetIndent = lang === 'th' ? '      ' : '    ';
    const cleanedVerBlock = verBlock.trim()
                                    .replace(/\s{8}/g, targetIndent + '  ') // Adjust inner properties
                                    .replace(/^\s*/, targetIndent); // Adjust outer name

    content = content.substring(0, absoluteJobsEndIndex) + '\n' + cleanedVerBlock + ',' + content.substring(absoluteJobsEndIndex);
}

// Perform moves
moveVerificationForSection('th');
moveVerificationForSection('en');

// Clean up the 'toast_rejected' garbage I introduced earlier in EN
content = content.replace(/\s{8}toast_rejected: 'Job rejected successfully'\n\s{6}\},\n\s{6}verification:/, '      verification:');

fs.writeFileSync(path, content, 'utf8');
console.log('Moved verification keys to top-level and cleaned up structure.');
