
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnostic() {
    console.log('🔍 Checking Jobs_Main structure...')
    
    const { data: sample, error } = await supabase
        .from('Jobs_Main')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error)
        return
    }

    if (sample && sample.length > 0) {
        console.log('Sample Keys:', Object.keys(sample[0]))
        
        // Try common date fields
        const keys = Object.keys(sample[0])
        const dateField = keys.find(k => k.toLowerCase() === 'created_at') || keys.find(k => k.toLowerCase() === 'plan_date')
        console.log('Detected date field for analysis:', dateField)
        
        if (dateField) {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            const { count } = await supabase
                .from('Jobs_Main')
                .select('*', { count: 'exact', head: true })
                .gte(dateField, sevenDaysAgo)
            
            console.log(`Jobs in last 7 days (via ${dateField}):`, count)
        }
    } else {
        console.log('No jobs found in Jobs_Main.')
    }
}

diagnostic()
