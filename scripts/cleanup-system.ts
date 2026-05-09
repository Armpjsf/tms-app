
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ASSETS_BUCKET = 'company-assets'

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Returns the ISO string for the 1st day of a month N months ago.
 * This ensures data is deleted in full month blocks.
 */
function getFirstDayOfMonth(monthsBack: number) {
    const d = new Date()
    // Move to the 1st of the CURRENT month (local time for the server)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    // Subtract months
    d.setMonth(d.getMonth() - monthsBack)
    return d.toISOString()
}

async function cleanup() {
    console.log('🚀 Starting Full-Month Retention Cleanup...')

    const nowStr = new Date().toLocaleString('th-TH')
    console.log(`Current Time (Thai): ${nowStr}`)

    // 1. GPS Logs - Keep Current Month + 1 Previous Month (Safe buffer)
    // Even though it's 7 days usually, let's keep it to 1 full month to be consistent 
    // with reporting, or stick to 7 days rolling if user prefers. 
    // User said "ลบผ่ากลางเดือน" for 30/45 days. GPS is usually purely for live tracking.
    // Let's use 14 days rolling for GPS as a compromise, or 1 full month.
    // Decision: Use 1 full month to ensure any monthly report for the previous month is complete.
    console.log('--- Cleaning GPS Logs (Full Previous Month Retention) ---')
    const gpsCutoff = getFirstDayOfMonth(1) // Keep current + 1 full previous month
    const { error: gpsErr, count: gpsCount } = await supabase
        .from('gps_logs')
        .delete({ count: 'exact' })
        .lt('timestamp', gpsCutoff)
    
    if (gpsErr) console.error(`GPS Error: ${gpsErr.message}`)
    else console.log(`Deleted ${gpsCount || 0} GPS logs older than ${gpsCutoff}.`)

    // 2. Logs, Chat & Market Data - Keep Current + 1 Full Previous Month
    const logsCutoff = getFirstDayOfMonth(1)
    const tables30 = [
        { name: 'System_Logs', dateCol: 'created_at' },
        { name: 'Chat_Messages', dateCol: 'Created_At' },
        { name: 'daily_fuel_prices', dateCol: 'Date' },
        { name: 'Push_Subscriptions', dateCol: 'Updated_At' }
    ]

    for (const table of tables30) {
        console.log(`--- Cleaning ${table.name} (Keep since ${logsCutoff}) ---`)
        const { error, count } = await supabase
            .from(table.name)
            .delete({ count: 'exact' })
            .lt(table.dateCol, logsCutoff)
        if (error) console.error(`${table.name} Error: ${error.message}`)
        else console.log(`Deleted ${count || 0} records from ${table.name}.`)
    }

    // 3. POD Images Storage Cleanup - Keep Current + 2 Full Previous Months
    // This ensures we have at least 60-90 days of images.
    const podCutoff = getFirstDayOfMonth(2)
    console.log(`--- Cleaning POD Images (Keep since ${podCutoff}) ---`)
    
    const { data: oldJobs, error: fetchErr } = await supabase
        .from('Jobs_Main')
        .select('Job_ID, Photo_Proof_Url, Signature_Url, Pickup_Photo_Url, Pickup_Signature_Url')
        .lt('Created_At', podCutoff)
        .or('Photo_Proof_Url.not.is.null,Signature_Url.not.is.null,Pickup_Photo_Url.not.is.null,Pickup_Signature_Url.not.is.null')
        .limit(100) 

    if (fetchErr) {
        console.error(`Error fetching old jobs for image cleanup: ${fetchErr.message}`)
    } else if (oldJobs && oldJobs.length > 0) {
        const pathsToDelete: string[] = []
        const jobIdsToUpdate: string[] = []

        oldJobs.forEach(job => {
            const fields = ['Photo_Proof_Url', 'Signature_Url', 'Pickup_Photo_Url', 'Pickup_Signature_Url']
            fields.forEach(field => {
                const urlString = (job as any)[field]
                if (urlString) {
                    const urls = urlString.split(',')
                    urls.forEach((url: string) => {
                        const path = url.split(`/public/${ASSETS_BUCKET}/`)[1]
                        if (path) pathsToDelete.push(path)
                    })
                }
            })
            jobIdsToUpdate.push(job.Job_ID)
        })

        if (pathsToDelete.length > 0) {
            console.log(`Deleting ${pathsToDelete.length} files from storage...`)
            const { error: storageErr } = await supabase.storage.from(ASSETS_BUCKET).remove(pathsToDelete)
            if (storageErr) console.error(`Storage Delete Error: ${storageErr.message}`)
            else console.log(`Successfully cleared ${pathsToDelete.length} files from storage.`)
        }

        if (jobIdsToUpdate.length > 0) {
            const { error: updateErr } = await supabase
                .from('Jobs_Main')
                .update({
                    Photo_Proof_Url: null,
                    Signature_Url: null,
                    Pickup_Photo_Url: null,
                    Pickup_Signature_Url: null
                })
                .in('Job_ID', jobIdsToUpdate)
            
            if (updateErr) console.error(`Database Update Error: ${updateErr.message}`)
            else console.log(`Cleared image links for ${jobIdsToUpdate.length} jobs.`)
        }
    } else {
        console.log('No old POD images found to clean.')
    }

    // 4. Long-term Transactional Data - Keep Current + 15 Full Previous Months
    const longTermCutoff = getFirstDayOfMonth(15)
    const longTermTables = [
        { name: 'Jobs_Main', dateCol: 'Created_At' },
        { name: 'invoices', dateCol: 'Created_At' },
        { name: 'Billing_Notes', dateCol: 'Billing_Date' }
    ]

    for (const table of longTermTables) {
        console.log(`--- Cleaning ${table.name} (Keep since ${longTermCutoff}) ---`)
        const { error, count } = await supabase
            .from(table.name)
            .delete({ count: 'exact' })
            .lt(table.dateCol, longTermCutoff)
        if (error) {
            if (error.message.includes('column "Created_At" does not exist')) {
                 await supabase.from(table.name).delete().lt('Issue_Date', longTermCutoff)
            } else {
                console.error(`${table.name} Error: ${error.message}`)
            }
        }
        else console.log(`Deleted ${count || 0} records from ${table.name}.`)
    }

    console.log('\n✨ Full-Month Cleanup Completed.')
}

cleanup()
