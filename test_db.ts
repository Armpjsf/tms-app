import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  let query = supabase
    .from('Jobs_Main')
    .select('Job_ID, Branch_ID')
    .in('Job_Status', ['Completed', 'Delivered', 'Finished', 'Closed'])
    .limit(10)

  const { data } = await query
  console.log(data)
}
check()
