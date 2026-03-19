import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing env vars')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUser() {
  const { data: users, error } = await supabase
    .from('Master_Users')
    .select('*')
  
  if (error) {
    console.error("Error fetching users:", error)
    return
  }

  console.log("Current Users Count:", users?.length)
  if (users && users.length > 0) {
    console.log("Super Admin Details:", JSON.stringify(users[0], null, 2))
  } else {
    console.log("NO USERS FOUND!")
  }

  const { data: branches, error: bError } = await supabase
    .from('Master_Branches')
    .select('*')
  
  if (bError) {
    console.error("Error fetching branches:", bError)
  } else {
    console.log("Current Branches:", JSON.stringify(branches, null, 2))
  }
}

checkUser()
