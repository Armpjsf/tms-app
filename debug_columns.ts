
import { createClient } from './src/utils/supabase/server'

async function debug() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.from('Jobs_Main').select('*').limit(1)
        if (error) {
            console.error('Error:', error)
            return
        }
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]))
        } else {
            console.log('No data found in Jobs_Main')
        }
    } catch (e) {
        console.error('Exception:', e)
    }
}

debug()
