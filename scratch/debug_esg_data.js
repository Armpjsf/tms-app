
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- Debugging Jobs_Main for ESG ---')
  
  // 1. Get status counts
  const { data: statuses, error: statusError } = await supabase
    .from('Jobs_Main')
    .select('Job_Status')
  
  if (statusError) {
    console.error('Error fetching statuses:', statusError)
  } else {
    const counts = statuses.reduce((acc, curr) => {
      acc[curr.Job_Status] = (acc[curr.Job_Status] || 0) + 1
      return acc
    }, {})
    console.log('Job_Status counts:', counts)
  }

  // 2. Sample 5 jobs to check column names and values
  const { data: samples, error: sampleError } = await supabase
    .from('Jobs_Main')
    .select('*')
    .limit(5)
  
  if (sampleError) {
    console.error('Error fetching samples:', sampleError)
  } else if (samples && samples.length > 0) {
    console.log('Sample Job columns:', Object.keys(samples[0]))
    console.log('Sample Job (first):', samples[0])
  } else {
    console.log('No jobs found in Jobs_Main')
  }
}

debug()
