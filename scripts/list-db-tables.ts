
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
    console.log('--- Listing All Tables in Public Schema ---')
    
    // Query the internal PostgreSQL tables to get our list
    const { data, error } = await supabase.rpc('get_tables')
    
    if (error) {
        // Fallback: Try a different approach if RPC is not enabled
        console.log('RPC get_tables failed. Trying query approach...')
        const { data: qData, error: qError } = await supabase
            .from('Jobs_Main')
            .select('count')
            .limit(1)
        
        console.log('Connection test for Jobs_Main:', qError ? qError.message : 'Success')
        
        // If we can't list tables, we'll try common variations
        const commonTables = [
            'System_Settings', 'company_profile', 'Company_Profile', 
            'master_company', 'Master_Company', 'settings', 'Settings',
            'app_settings', 'branch_profile', 'Branch_Profile'
        ]
        console.log('Testing common table names...')
        for (const t of commonTables) {
            const { error: e } = await supabase.from(t).select('*').limit(1)
            if (!e) console.log(`[FOUND] Table exists: ${t}`)
        }
    } else {
        console.log('Tables found:', data)
    }
}

listTables()
