import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { subDays, format } from 'date-fns'

// Load environment variables
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  process.exit(1)
}

// Initialize Supabase with service_role to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

/**
 * Cleanup Config
 */
const RETENTION = {
    POD: 7,          // Days
    BILLING: 180,    // Days
    GPS_GENERAL: 30, // Days (Fallback)
    GPS_JOB_DONE: 2  // Days (After job is 'Completed')
}

const STORAGE_BUCKETS = {
    POD: [
        'POD_Photos', 
        'POD_Signatures', 
        'POD_Documents', 
        'Pickup_Photos', 
        'Pickup_Signatures', 
        'Pickup_Documents'
    ],
    BILLING: ['billing-documents']
}

async function cleanupStorage() {
    console.log('--- Starting Storage Cleanup ---')
    
    const now = new Date()

    // 1. Cleanup POD/Pickup Folders (7 Days)
    for (const bucket of STORAGE_BUCKETS.POD) {
        try {
            console.log(`Processing Bucket: ${bucket}...`)
            const { data: files, error } = await supabase.storage.from(bucket).list()
            
            if (error) {
                console.error(`Error listing bucket ${bucket}:`, error.message)
                continue
            }

            if (!files || files.length === 0) continue

            const filesToDelete = files
                .filter(file => {
                    const createdAt = new Date(file.created_at)
                    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24)
                    return ageInDays > RETENTION.POD
                })
                .map(file => file.name)

            if (filesToDelete.length > 0) {
                const { error: delError } = await supabase.storage.from(bucket).remove(filesToDelete)
                if (delError) console.error(`Failed to delete in ${bucket}:`, delError.message)
                else console.log(`Successfully deleted ${filesToDelete.length} files in ${bucket}`)
            }
        } catch (e) {
            console.error(`Bucket ${bucket} processing failed:`, e)
        }
    }

    // 2. Cleanup Billing Folders (180 Days)
    for (const bucket of STORAGE_BUCKETS.BILLING) {
        try {
            console.log(`Processing Bucket: ${bucket}...`)
            const { data: files, error } = await supabase.storage.from(bucket).list()
            
            if (error) continue
            if (!files || files.length === 0) continue

            const filesToDelete = files
                .filter(file => {
                    const createdAt = new Date(file.created_at)
                    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24)
                    return ageInDays > RETENTION.BILLING
                })
                .map(file => file.name)

            if (filesToDelete.length > 0) {
                await supabase.storage.from(bucket).remove(filesToDelete)
                console.log(`Successfully deleted ${filesToDelete.length} files in ${bucket}`)
            }
        } catch (e) {
            console.error(`Bucket ${bucket} processing failed:`, e)
        }
    }
}

async function cleanupDatabase() {
    console.log('\n--- Starting Database Cleanup ---')

    const twoDaysAgo = format(subDays(new Date(), RETENTION.GPS_JOB_DONE), 'yyyy-MM-dd')
    const thirtyDaysAgo = subDays(new Date(), RETENTION.GPS_GENERAL).toISOString()

    // 1. Delete GPS Logs linked to Completed Jobs older than 2 days
    console.log(`Deleting GPS logs for completed jobs before ${twoDaysAgo}...`)
    
    // Find Job IDs that are completed and older than 2 days
    const { data: completedJobs } = await supabase
        .from('Jobs_Main')
        .select('Job_ID')
        .in('Job_Status', ['Completed', 'Delivered'])
        .lte('Delivery_Date', twoDaysAgo)

    if (completedJobs && completedJobs.length > 0) {
        const jobIds = completedJobs.map(j => j.Job_ID)
        const { error: gpsError, count } = await supabase
            .from('gps_logs')
            .delete({ count: 'exact' })
            .in('job_id', jobIds)
        
        if (gpsError) console.error('Error deleting GPS logs by Job:', gpsError.message)
        else console.log(`Successfully deleted ${count || 0} GPS records linked to completed jobs.`)
    }

    // 2. General Fallback: Delete any GPS logs older than 30 days
    console.log(`Deleting general GPS logs older than ${RETENTION.GPS_GENERAL} days...`)
    const { error: genericGpsError, count: genericCount } = await supabase
        .from('gps_logs')
        .delete({ count: 'exact' })
        .lt('timestamp', thirtyDaysAgo)

    if (genericGpsError) console.error('Error deleting generic GPS logs:', genericGpsError.message)
    else console.log(`Successfully deleted ${genericCount || 0} old GPS records (Fallback cleanup).`)
}

// Support manual vehicle plate deletion via CLI arg: --vehicle-plate="ABC-123"
async function handleManualDeletion() {
    const args = process.argv.slice(2)
    const plateArg = args.find(a => a.startsWith('--vehicle-plate='))
    
    if (plateArg) {
        const plate = plateArg.split('=')[1]
        console.log(`\n--- Manual Deletion Triggered for Vehicle: ${plate} ---`)
        const { error, count } = await supabase
            .from('gps_logs')
            .delete({ count: 'exact' })
            .eq('vehicle_plate', plate)
        
        if (error) console.error('Manual deletion error:', error.message)
        else console.log(`Successfully cleared ${count || 0} records for vehicle ${plate}`)
    }
}

async function main() {
    try {
        await cleanupStorage()
        await cleanupDatabase()
        await handleManualDeletion()
        console.log('\n--- Cleanup System Run Complete ---')
    } catch (err) {
        console.error('Core Cleanup execution failed:', err)
        process.exit(1)
    }
}

main()
