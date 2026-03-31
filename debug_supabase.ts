import { createAdminClient } from './src/utils/supabase/server'

async function debugData() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Job_Status, Plan_Date')
    .limit(5)
  
  if (error) {
    console.error('Error fetching data:', error)
    return
  }
  
  console.log('Sample data from Jobs_Main:')
  console.log(JSON.stringify(data, null, 2))
}

debugData()
