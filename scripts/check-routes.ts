
import { createClient } from '@/utils/supabase/client'

const fetchRoutes = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('Master_Routes').select('*').limit(5)
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Routes:', JSON.stringify(data, null, 2))
    }
}

fetchRoutes()
