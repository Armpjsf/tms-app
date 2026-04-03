const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, key)

async function inspect() {
  console.log("--- PUSH SUBSCRIPTIONS ---")
  const { data, error } = await supabase.from('Push_Subscriptions').select('*').limit(2)
  if (error) {
    console.error("Error fetching subs:", error)
    return
  }
  console.log(JSON.stringify(data, null, 2))
  
  if (data && data.length > 0) {
    const userId = data[0].User_ID
    console.log(`\nAnalyzing User_ID: ${userId}`)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    console.log(`Is UUID? ${isUuid}`)
  }
}

inspect().catch(console.error)
