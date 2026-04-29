import { createAdminClient } from './src/utils/supabase/server'

async function test() {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase.from('Master_Routes').select('*').limit(1)
        console.log('Data:', data)
        console.log('Error:', error)
    } catch (e) {
        console.error('Exception:', e)
    }
}

test()
