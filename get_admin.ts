import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as argon2 from 'argon2'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing env vars')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  const hash = await argon2.hash('password123')
  const { data, error } = await supabase.from('Master_Users').upsert({
    Username: 'testadmin',
    Password: hash,
    Role: 'Admin',
    Role_ID: 2,
    Permissions: {"manage_settings": true, "show_income": true, "manage_drivers": true, "manage_jobs": true}
  })
  
  if (error) console.error("Error:", error)
  else console.log("Created testadmin/password123 successfully.")
}
test()
