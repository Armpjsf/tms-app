
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

async function inspectJobs() {
    const { data: jobs, error } = await supabase.from('Jobs_Main').select('*').limit(5)
    if (error) {
        console.error(error)
        return
    }

    if (jobs && jobs.length > 0) {
        console.log('--- Columns in Jobs_Main ---')
        console.log(Object.keys(jobs[0]))
        console.log('\n--- Sample Job Data ---')
        console.log(jobs[0])
    } else {
        console.log('No jobs found in Jobs_Main')
    }
}

inspectJobs()
