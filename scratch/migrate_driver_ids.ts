
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

async function migrateDriverIds() {
    console.log('--- Starting Driver ID Migration ---')

    // 1. Get all valid drivers
    const { data: drivers, error: dError } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name')
    if (dError) {
        console.error('Error fetching drivers:', dError)
        return
    }

    const driverMap = new Map<string, string>() // Name -> ID
    drivers.forEach(d => {
        if (d.Driver_Name) {
            driverMap.set(d.Driver_Name.trim(), d.Driver_ID)
        }
    })

    console.log(`Loaded ${driverMap.size} driver name-to-id mappings.`)

    // 2. Find jobs with IDs that don't exist in Master_Drivers
    const validIds = new Set(drivers.map(d => d.Driver_ID))
    const { data: jobs, error: jError } = await supabase.from('Jobs_Main').select('Job_ID, Driver_ID, Driver_Name')
    if (jError) {
        console.error('Error fetching jobs:', jError)
        return
    }

    const orphanedJobs = jobs.filter(j => j.Driver_ID && !validIds.has(j.Driver_ID))
    console.log(`Found ${orphanedJobs.length} jobs with orphaned Driver_IDs.`)

    let successCount = 0
    let failCount = 0
    let noMatchCount = 0

    for (const job of orphanedJobs) {
        const name = job.Driver_Name?.trim()
        const newId = name ? driverMap.get(name) : null

        if (newId) {
            console.log(`Migrating Job ${job.Job_ID}: "${name}" (${job.Driver_ID} -> ${newId})`)
            const { error: uError } = await supabase
                .from('Jobs_Main')
                .update({ Driver_ID: newId })
                .eq('Job_ID', job.Job_ID)

            if (uError) {
                console.error(`  Failed to update Job ${job.Job_ID}:`, uError.message)
                failCount++
            } else {
                successCount++
            }
        } else {
            console.warn(`  No mapping found for Job ${job.Job_ID} (Driver Name: "${job.Driver_Name}", Old ID: ${job.Driver_ID})`)
            noMatchCount++
        }
    }

    console.log('\n--- Migration Summary ---')
    console.log(`Successfully migrated: ${successCount}`)
    console.log(`Failed to migrate: ${failCount}`)
    console.log(`No matching name found: ${noMatchCount}`)
    console.log('---------------------------')
}

migrateDriverIds()
