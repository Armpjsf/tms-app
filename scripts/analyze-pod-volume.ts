
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyze() {
    console.log('📊 Analyzing POD Data Volume...')

    // 1. Total Jobs
    const { count: totalJobs } = await supabase
        .from('Jobs_Main')
        .select('*', { count: 'exact', head: true })

    // 2. Jobs with POD Photos
    const { count: jobsWithPhotos } = await supabase
        .from('Jobs_Main')
        .select('*', { count: 'exact', head: true })
        .not('Photo_Proof_Url', 'is', null)

    // 3. Recent Jobs (Last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: recentJobs } = await supabase
        .from('Jobs_Main')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo)

    console.log(`Total Jobs: ${totalJobs}`)
    console.log(`Jobs with Photos: ${jobsWithPhotos}`)
    console.log(`Recent Jobs (7 days): ${recentJobs}`)

    // Estimate
    const avgJobsPerDay = (recentJobs || 0) / 7
    const estJobs45Days = avgJobsPerDay * 45
    
    // Assume average 3 photos per job, 200KB per photo (compressed)
    const estPhotoSizeKB = 200 * 3 
    const estTotalSizeMB = (estJobs45Days * estPhotoSizeKB) / 1024

    console.log(`\n--- Estimation for 45 Days ---`)
    console.log(`Avg Jobs/Day: ${avgJobsPerDay.toFixed(2)}`)
    console.log(`Est. Jobs in 45 Days: ${estJobs45Days.toFixed(0)}`)
    console.log(`Est. Storage Usage (at 600KB/job): ${estTotalSizeMB.toFixed(2)} MB`)
    console.log(`Free Tier Limit: 1024 MB`)
}

analyze()
