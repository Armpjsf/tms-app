import { createAdminClient } from './src/utils/supabase/server'

async function inspectTable() {
    const supabase = createAdminClient()
    console.log('--- Inspecting Jobs_Main Column Names ---')
    
    // Get 1 row to see all available columns
    const { data, error } = await supabase.from('Jobs_Main').select('*').limit(1)
    if (error) {
        console.error('Error:', error)
        return
    }
    
    if (data && data.length > 0) {
        console.log('Available Columns:', Object.keys(data[0]))
        console.log('Sample Row Data:', data[0])
    } else {
        console.log('No data found in Jobs_Main')
    }
    
    // Check count for SKN today with different potential columns
    const targetDate = '2026-04-27'
    const { count: countPlan } = await supabase.from('Jobs_Main').select('*', { count: 'exact', head: true }).ilike('Branch_ID', '%SKN%').eq('Plan_Date', targetDate)
    const { count: countCreated } = await supabase.from('Jobs_Main').select('*', { count: 'exact', head: true }).ilike('Branch_ID', '%SKN%').gte('Created_At', `${targetDate}T00:00:00`).lte('Created_At', `${targetDate}T23:59:59`)
    
    console.log(`Count by Plan_Date: ${countPlan}`)
    console.log(`Count by Created_At: ${countCreated}`)
}

inspectTable()
