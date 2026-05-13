import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function checkCounts() {
  const { count: driverCount } = await supabase.from('Master_Drivers').select('*', { count: 'exact', head: true })
  const { count: subCount } = await supabase.from('Master_Subcontractors').select('*', { count: 'exact', head: true })
  const { count: jobCount } = await supabase.from('Jobs_Main').select('*', { count: 'exact', head: true })
  
  console.log('Drivers:', driverCount)
  console.log('Subcontractors:', subCount)
  console.log('Total Jobs:', jobCount)
}

checkCounts()
