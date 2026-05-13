import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFuelPrices() {
  const { data, error } = await supabase
    .from('daily_fuel_prices')
    .select('*')
    .order('Date', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching fuel prices:', error)
  } else {
    console.log('Fuel Prices:', data)
  }
}

checkFuelPrices()
