
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnostic() {
    console.log('🔍 Checking GPS_Logs structure...')
    const { data, error } = await supabase.from('GPS_Logs').select('*').limit(1)
    if (error) {
        console.log('Error with GPS_Logs:', error.message)
        const { data: data2, error: error2 } = await supabase.from('gps_logs').select('*').limit(1)
        if (error2) console.log('Error with gps_logs:', error2.message)
        else if (data2) console.log('Sample gps_logs keys:', Object.keys(data2[0]))
    } else if (data) {
        console.log('Sample GPS_Logs keys:', Object.keys(data[0]))
    }
}
diagnostic()
