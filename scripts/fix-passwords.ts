
import { createClient } from '@supabase/supabase-js'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function fixPasswords() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env variables')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fix user 'first'
    const password = '123456'
    const hashedPassword = await argon2.hash(password)
    
    console.log('Hashing password for user: first')
    const { error: error1 } = await supabase
        .from('Master_Users')
        .update({ Password: hashedPassword })
        .eq('Username', 'first')
    
    if (error1) {
        console.error('Error updating first:', error1)
    } else {
        console.log('Successfully updated first')
    }

    // Also check if admin exists, if not, maybe create?
    // But let's just fix what's there first.
}

fixPasswords()
