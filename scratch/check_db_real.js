
const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://jhksvhujsrbkeyzpvpog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impoa3N2aHVqc3Jia2V5enB2cG9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg4OTYzOSwiZXhwIjoyMDgxNDY1NjM5fQ.usBqbrhcceLEdQN48ZSZxfFFFfsJG0cZbfYJYNa2kfM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJobs() {
    console.log('--- Checking Job Status Distribution ---');
    const { data: statuses, error: sError } = await supabase
        .from('Jobs_Main')
        .select('Job_Status, count()');
    
    if (sError) console.error('Status Error:', sError);
    else console.log('Statuses:', statuses);

    console.log('--- Checking Date Range ---');
    const { data: dates, error: dError } = await supabase
        .from('Jobs_Main')
        .select('Plan_Date')
        .order('Plan_Date', { ascending: false })
        .limit(10);
    
    if (dError) console.error('Date Error:', dError);
    else console.log('Recent Dates:', dates);

    console.log('--- Checking Branch IDs ---');
    const { data: branches, error: bError } = await supabase
        .from('Jobs_Main')
        .select('Branch_ID')
        .limit(10);
    
    if (bError) console.error('Branch Error:', bError);
    else console.log('Sample Branch IDs:', branches);
}

checkJobs();
