
import { createAdminClient } from '../src/utils/supabase/server'

async function checkIPs() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('User_Approved_IPs')
        .select('*')
    
    if (error) {
        console.error("Error fetching IPs:", error)
        return
    }

    console.log("Total records in User_Approved_IPs:", data.length)
    console.log("Records:", JSON.stringify(data, null, 2))
}

checkIPs()
