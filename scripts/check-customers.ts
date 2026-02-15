
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCustomers() {
  console.log('Checking Master_Customers...')
  
  // Check total count
  const { count, error: countError } = await supabase
    .from('Master_Customers')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('Error counting customers:', countError)
    return
  }
  console.log(`Total Customers in DB: ${count}`)

  // Check active customers
  const { data: activeData, error: activeError } = await supabase
    .from('Master_Customers')
    .select('Customer_Name, Is_Active')
    .eq('Is_Active', true)
    
  if (activeError) {
    console.error('Error fetching active customers:', activeError)
    return
  }
  
  console.log(`Active Customers (Is_Active=true): ${activeData.length}`)
  if (activeData.length > 0) {
      console.log('Sample Active Customers:', activeData.slice(0, 5).map(c => c.Customer_Name))
  } else {
      // Check if Is_Active is null for many
      const { data: nullActive } = await supabase
        .from('Master_Customers')
        .select('Customer_Name')
        .is('Is_Active', null)
        .limit(5)
      
      if (nullActive && nullActive.length > 0) {
          console.log('Found customers with Is_Active = NULL:', nullActive)
      }
  }
}

checkCustomers()
