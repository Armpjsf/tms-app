
import { createAdminClient } from './src/utils/supabase/server';

async function checkTable() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('Push_Subscriptions').select('*').limit(1);
    if (error) {
        console.error("Error fetching Push_Subscriptions:", error);
    } else {
        console.log("Sample Data:", data);
    }
}

checkTable();
