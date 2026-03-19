import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as argon2 from 'argon2'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing env vars')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function restoreAdmin() {
  const hash = await argon2.hash('admin1234')
  const { data, error } = await supabase.from('Master_Users').upsert({
    Username: 'admin',
    Password: hash,
    Role: 'Admin',
    Role_ID: 1,
    Branch_ID: 'HQ',
    Permissions: {
      "dashboard": ["view"],
      "jobs": ["view", "create", "edit", "delete", "approve"],
      "planning": ["view", "manage"],
      "billing": ["view", "create", "print", "approve"],
      "settings": ["view", "manage"],
      "users": ["view", "create", "edit", "delete"]
    }
  }, { onConflict: 'Username' })
  
  if (error) {
    console.error("Error restoring admin:", error)
  } else {
    console.log("Super Admin 'admin' restored with password 'admin1234'")
  }
}

restoreAdmin()
