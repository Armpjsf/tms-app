
import { createAdminClient } from '../src/utils/supabase/server'

async function listTables() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('get_tables_info')
    
    // If RPC doesn't exist, try a raw query via postgrest if possible
    // Or just try the lowercase version of the table
    const { data: dataLower, error: errorLower } = await supabase
        .from('user_approved_ips')
        .select('*')
        .limit(5)
    
    if (errorLower) {
        console.error("Error fetching lowercase table:", errorLower)
    } else {
        console.log("SUCCESS with lowercase table name!")
        console.log("Records:", JSON.stringify(dataLower, null, 2))
    }
}

listTables()
