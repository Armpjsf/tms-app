import { createAdminClient } from './src/utils/supabase/server'

async function debugSKN() {
    const supabase = createAdminClient()
    const targetDate = '2026-04-27'
    console.log('--- Debug SKN Jobs for', targetDate, '---')
    
    const { data, error } = await supabase
        .from('Jobs_Main')
        .select('Job_ID, Job_Status, Branch_ID, Plan_Date')
        .ilike('Branch_ID', 'SKN')
        .eq('Plan_Date', targetDate)
        
    if (error) {
        console.error('Error:', error)
        return
    }
    
    console.log('Total found with exact date:', data.length)
    const stats = data.reduce((acc, j) => {
        acc[j.Job_Status] = (acc[j.Job_Status] || 0) + 1
        return acc
    }, {})
    console.log('Status breakdown:', stats)
    
    // Check if there are jobs for SKN today that DON'T match the exact date string
    // (e.g. they have timestamps)
    const { data: data2 } = await supabase
        .from('Jobs_Main')
        .select('Job_ID, Plan_Date, Job_Status')
        .ilike('Branch_ID', 'SKN')
        .filter('Plan_Date', 'gte', '2026-04-27')
        .filter('Plan_Date', 'lt', '2026-04-28')
        
    console.log('Total found with date range:', data2?.length ?? 0)
}

debugSKN()
