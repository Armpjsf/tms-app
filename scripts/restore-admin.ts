
import { createClient } from '@supabase/supabase-js'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function restoreAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env variables')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const password = '123456'
    const hashedPassword = await argon2.hash(password)
    
    // 1. Check if 'admin' exists
    const { data: adminExists } = await supabase
        .from('Master_Users')
        .select('Username')
        .eq('Username', 'admin')
        .single()
    
    if (!adminExists) {
        console.log('Creating admin user...')
        const { error: createError } = await supabase
            .from('Master_Users')
            .insert([{
                Username: 'admin',
                Password: hashedPassword,
                Name: 'System Administrator',
                Role: 'Super Admin',
                Active_Status: 'Active',
                Branch_ID: 'Main'
            }])
        if (createError) console.error('Error creating admin:', createError)
        else console.log('Successfully created admin user')
    } else {
        console.log('Admin user exists, updating password...')
        await supabase
            .from('Master_Users')
            .update({ Password: hashedPassword })
            .eq('Username', 'admin')
        console.log('Successfully updated admin password')
    }

    // 2. Ensure 'first' is also correct
    console.log('Updating first user password...')
    await supabase
        .from('Master_Users')
        .update({ Password: hashedPassword })
        .eq('Username', 'first')
    console.log('Successfully updated first user password')

    // 3. Final Check
    const { data: users } = await supabase.from('Master_Users').select('Username, Name, Role')
    console.log('Current User List:', users)
}

restoreAdmin()
