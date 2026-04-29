import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLogs() {
  console.log('Fetching recent System_Logs...')
  const { data, error } = await supabase
    .from('System_Logs')
    .select('module, action_type, details, created_at, username')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching logs:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('No logs found.')
    return
  }

  // Format details for easier reading if it's an object
  const formattedData = data.map(log => ({
    ...log,
    details: typeof log.details === 'object' ? JSON.stringify(log.details).substring(0, 50) : log.details
  }))

  console.table(formattedData)
}

checkLogs()
