
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function searchAllTables() {
    console.log('--- Database Global Search Starting ---')
    
    // List of common tables that might store URLs
    const tables = [
        'Master_Company',
        'Company_Profile',
        'Settings',
        'Jobs_Main',
        'Billing_Notes',
        'Master_Customers'
    ]

    for (const table of tables) {
        console.log(`Checking table: ${table}...`)
        
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(100)

            if (error) {
                console.error(`Error fetching ${table}:`, error.message)
                continue
            }

            if (!data || data.length === 0) {
                console.log(`Table ${table} is empty.`)
                continue
            }

            data.forEach((row, index) => {
                const rowStr = JSON.stringify(row)
                if (rowStr.includes('tms-app-five')) {
                    console.log(`[FOUND] in Table: ${table}, Row Index: ${index}`)
                    console.log('Data:', JSON.stringify(row, null, 2))
                }
            })
        } catch (e) {
            console.error(`Failed to scan ${table}:`, e)
        }
    }
    
    console.log('--- Search Finished ---')
}

searchAllTables()
