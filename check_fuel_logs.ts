
import { getSystemLogs } from './src/lib/supabase/logs';

async function checkLogs() {
    console.log('Checking recent fuel logs...');
    try {
        const logs = await getSystemLogs({ module: 'Fuel', limit: 5 });
        console.log('Recent Logs:', JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error('Error fetching logs:', e);
    }
}

checkLogs();
