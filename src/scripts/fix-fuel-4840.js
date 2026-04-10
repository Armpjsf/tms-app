const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const today = new Date().toISOString().split('T')[0]
  const price = 48.40
  console.log(`Setting price for ${today} to ${price}...`)
  
  const { error } = await supabase
    .from('daily_fuel_prices')
    .upsert({
      Date: today,
      Fuel_Type: 'Diesel B7',
      Price: price,
      Updated_At: new Date().toISOString()
    })
    
  if (error) console.error(error)
  else console.log('Fixed to 48.40!')
}

run()
