
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkPrices() {
    console.log("Checking Fuel Prices for Apr 21-23...")
    const { data: fuel, error: e1 } = await supabase
        .from('daily_fuel_prices')
        .select('*')
        .gte('Date', '2026-04-21')
        .lte('Date', '2026-04-23')
    
    if (e1) console.error("Fuel Error:", e1)
    else console.log("Fuel Prices:", fuel)

    console.log("\nChecking Route Matrices...")
    const { data: matrix, error: e2 } = await supabase
        .from('Customer_Route_Rates')
        .select('*')
    
    if (e2) console.error("Matrix Error:", e2)
    else console.log("Matrices Found:", matrix?.length)
}

checkPrices()
