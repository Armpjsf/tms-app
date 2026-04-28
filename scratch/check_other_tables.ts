
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOtherTables() {
    const { data: drivers } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name')
    const validIds = new Set(drivers?.map(d => d.Driver_ID))
    
    const tables = ['Fuel_Logs', 'Repair_Tickets', 'sos_alerts', 'chat_messages']
    
    for (const table of tables) {
        console.log(`\n--- Checking ${table} ---`)
        const { data, error } = await supabase.from(table).select('*').limit(100)
        if (error) {
            console.log(`  Table ${table} not accessible or error:`, error.message)
            continue
        }
        
        if (!data || data.length === 0) {
            console.log(`  Table ${table} is empty.`)
            continue
        }

        const orphanCount = data.filter(row => {
            const id = row.Driver_ID || row.driver_id
            return id && !validIds.has(id)
        }).length
        
        console.log(`  Found ${orphanCount} orphaned records in ${table}.`)
        if (orphanCount > 0) {
            // Check if we can map them by name
            const sample = data.find(row => {
                const id = row.Driver_ID || row.driver_id
                return id && !validIds.has(id)
            })
            console.log(`  Sample Orphan ID: ${sample.Driver_ID || sample.driver_id} | Name in record: ${sample.Driver_Name || sample.driver_name || 'N/A'}`)
        }
    }
}

checkOtherTables()
