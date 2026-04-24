import { createAdminClient } from './src/utils/supabase/server'

async function checkData() {
  const supabase = createAdminClient()
  
  const { data: stats, error } = await supabase
    .from('Jobs_Main')
    .select('Plan_Date, Branch_ID, Job_Status')
  
  if (error) {
    console.error('Error fetching jobs:', error)
    return
  }

  const countsByDate = {}
  stats.forEach(j => {
    const key = `${j.Plan_Date} [${j.Branch_ID}]`
    countsByDate[key] = (countsByDate[key] || 0) + 1
  })

  console.log('--- Job Counts by Date and Branch ---')
  Object.entries(countsByDate).sort().forEach(([key, count]) => {
    console.log(`${key}: ${count} jobs`)
  })
}

// Note: This needs to be run in a way that has access to env vars.
// Since I can't run this directly easily, I will instead 
// suggest to the user what might be happening.
