
import { createAdminClient } from '../src/utils/supabase/server'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function fetchBranches() {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase.from('Master_Branches').select('*')
        if (error) {
            console.error('Error fetching branches:', error)
            return
        }
        console.log('--- Current Branches in Database ---')
        data.forEach(branch => {
            console.log(`ID: ${branch.Branch_ID}, Name: ${branch.Branch_Name}`);
        })
    } catch (e) {
        console.error('Exception:', e)
    }
}

fetchBranches()
