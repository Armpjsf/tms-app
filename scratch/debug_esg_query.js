
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const REVENUE_STATUSES = [
    'Completed', 'Delivered', 'Finished', 'Closed', 'Complete', 'Success', 'Done', 'Finish', 'Arrived', 'Arrived Destination',
    'completed', 'delivered', 'finished', 'closed', 'complete', 'success', 'done', 'finish', 'arrived',
    'เสร็จสิ้น', 'เรียบร้อย', 'ส่งสำเร็จ', 'ปิดงาน', 'สำเร็จ', 'ถึงที่หมาย', 'ถึงจุดหมาย', 'ถึงที่ส่ง', 'จบงาน'
]

async function debug() {
  console.log('--- Simulating getESGStats query ---')
  
  let query = supabase
      .from('Jobs_Main')
      .select('Job_ID, Job_Status, Plan_Date')
      .in('Job_Status', REVENUE_STATUSES)

  const { data, error, count } = await query.limit(10)
  
  if (error) {
    console.error('Query Error:', error)
  } else {
    console.log('Sample matching jobs:', data.length)
    if (data.length > 0) {
      console.log('First job status:', data[0].Job_Status)
    }
  }

  // Count without .in to compare
  const { count: totalCompleted } = await supabase
    .from('Jobs_Main')
    .select('*', { count: 'exact', head: true })
    .eq('Job_Status', 'Completed')
  
  console.log('Total jobs with Status=Completed:', totalCompleted)
}

debug()
