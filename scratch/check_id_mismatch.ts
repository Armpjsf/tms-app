
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkJobsAndDrivers() {
    console.log('--- Checking for ID mismatches ---')
    
    const { data: drivers } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name')
    const { data: jobs } = await supabase.from('Jobs_Main').select('Job_ID, Driver_ID, Plan_Date').limit(100)
    
    if (!drivers || !jobs) return

    const driverIds = new Set(drivers.map(d => d.Driver_ID))
    const jobDriverIds = new Set(jobs.filter(j => j.Driver_ID).map(j => j.Driver_ID))

    console.log('\nDriver IDs in Master_Drivers:', Array.from(driverIds).slice(0, 5), '...')
    console.log('Driver IDs used in Jobs_Main:', Array.from(jobDriverIds).slice(0, 5), '...')

    const missingInMaster = Array.from(jobDriverIds).filter(id => !driverIds.has(id))
    if (missingInMaster.length > 0) {
        console.log('\n--- DRIVER IDs IN JOBS BUT MISSING IN MASTER (OLD IDs?) ---')
        missingInMaster.forEach(id => {
            const count = jobs.filter(j => j.Driver_ID === id).length
            console.log(`ID: ${id} | Jobs count: ${count}`)
        })
    } else {
        console.log('\nAll Driver IDs in Jobs match Master_Drivers records.')
    }
}

checkJobsAndDrivers()
