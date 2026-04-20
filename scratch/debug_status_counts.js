
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- Job Status Counts ---')
  const { data: jobs, error } = await supabase
    .from('Jobs_Main')
    .select('Job_Status, Branch_ID, Customer_ID, Plan_Date')
    .limit(1000)
  
  if (error) {
    console.error(error)
    return
  }

  const statusCounts = {}
  jobs.forEach(j => {
    statusCounts[j.Job_Status] = (statusCounts[j.Job_Status] || 0) + 1
  })
  console.log(JSON.stringify(statusCounts, null, 2))
  
  console.log('--- Sample Dates ---')
  console.log(jobs.slice(0, 5).map(j => j.Plan_Date))
}

debug()
