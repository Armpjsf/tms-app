import { createAdminClient } from './src/utils/supabase/server'

async function checkIds() {
  const supabase = await createAdminClient()
  
  console.log("--- PUSH SUBSCRIPTIONS ---")
  const { data: subs } = await supabase.from('Push_Subscriptions').select('User_ID, Driver_ID').limit(5)
  console.log(JSON.stringify(subs, null, 2))

  console.log("\n--- MASTER USERS ---")
  const { data: users } = await supabase.from('Master_Users').select('Username, Name').limit(5)
  console.log(JSON.stringify(users, null, 2))
}

checkIds().catch(console.error)
