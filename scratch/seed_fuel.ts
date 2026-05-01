
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function seedHistoricalFuel() {
    console.log("Seeding Fuel Prices for Apr 21-23 (Setting to 42.0 to trigger 17 THB rate)...")
    const prices = [
        { Date: '2026-04-21', Fuel_Type: 'Diesel B7', Price: 42.0 },
        { Date: '2026-04-22', Fuel_Type: 'Diesel B7', Price: 42.0 },
        { Date: '2026-04-23', Fuel_Type: 'Diesel B7', Price: 42.0 },
    ]

    const { data, error } = await supabase
        .from('daily_fuel_prices')
        .upsert(prices, { onConflict: 'Date' })
    
    if (error) console.error(error)
    else console.log("Successfully seeded historical fuel prices.")
}

seedHistoricalFuel()
