
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixSystemSettings() {
    console.log('--- Checking System_Settings for Old URL ---')
    
    const keys = ['accounting_profile', 'company_profile']

    for (const key of keys) {
        console.log(`Checking key: ${key}...`)
        const { data, error } = await supabase
            .from('System_Settings')
            .select('*')
            .eq('key', key)
            .maybeSingle()

        if (error) {
            console.error(`Error fetching ${key}:`, error.message)
            continue
        }

        if (!data) {
            console.log(`Key ${key} not found.`)
            continue
        }

        const valueStr = typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
        
        if (valueStr.includes('tms-app-five')) {
            console.log(`[FOUND] Old URL detected in ${key}!`)
            console.log('Current Value:', valueStr)
            
            // Generate New Value (Replace old URL with a generic one or empty, 
            // since our code now handles baseUrl dynamically)
            const newValueStr = valueStr.replace(/https:\/\/tms-app-five\.vercel\.app/g, '')
            const newValue = JSON.parse(newValueStr)

            console.log('Attempting to update with cleaned value...')
            const { error: updateError } = await supabase
                .from('System_Settings')
                .update({ value: newValue })
                .eq('key', key)

            if (updateError) {
                console.error(`Update failed for ${key}:`, updateError.message)
            } else {
                console.log(`[SUCCESS] ${key} updated and cleaned!`)
            }
        } else {
            console.log(`Key ${key} is clean.`)
        }
    }
}

fixSystemSettings()
