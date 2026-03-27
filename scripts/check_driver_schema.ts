import { createAdminClient } from '../src/utils/supabase/server'

async function checkSchema() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.from('Master_Drivers').select('*').limit(1)
    if (error) {
        console.error('Error fetching schema:', error)
        return
    }
    if (data && data.length > 0) {
        console.log('Master_Drivers Columns:', Object.keys(data[0]))
    } else {
        console.log('No data in Master_Drivers')
    }
}

checkSchema()
