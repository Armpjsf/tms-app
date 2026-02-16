
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function listUsers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env variables')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase
        .from('Master_Users')
        .select('Username, Name')
    
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Total Users:', data.length)
        console.log('User list:', data)
    }
}

listUsers()
