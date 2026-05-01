
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkLatestPrice() {
    console.log("Checking Latest Fuel Price in DB...")
    const { data: latest, error } = await supabase
        .from('daily_fuel_prices')
        .select('*')
        .order('Date', { ascending: false })
        .limit(5)
    
    if (error) console.error(error)
    else console.log(latest)
}

checkLatestPrice()
