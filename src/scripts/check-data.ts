import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('--- Drivers ---')
  const { data: drivers } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Branch_ID').limit(5)
  console.log(drivers)

  console.log('\n--- Customers ---')
  const { data: customers } = await supabase.from('Master_Customers').select('Customer_ID, Customer_Name, Branch_ID').limit(5)
  console.log(customers)
  
  console.log('\n--- Branches ---')
  const { data: branches } = await supabase.from('Master_Branches').select('*').limit(5)
  console.log(branches)
}

checkData()
