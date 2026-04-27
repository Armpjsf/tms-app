import { createAdminClient } from './src/utils/supabase/server'

async function checkTodayJobs() {
    const supabase = createAdminClient()
    const targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    console.log('Checking jobs for date:', targetDate)
    
    const { data, error } = await supabase
        .from('Jobs_Main')
        .select('Job_Status')
        .eq('Plan_Date', targetDate)
        
    if (error) {
        console.error('Error:', error)
        return
    }
    
    console.log('Total jobs found:', data.length)
    const stats = data.reduce((acc, j) => {
        acc[j.Job_Status] = (acc[j.Job_Status] || 0) + 1
        return acc
    }, {})
    console.log('Status breakdown:', stats)
}

checkTodayJobs()
