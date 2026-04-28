
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

async function checkDrivers() {
    const { data: drivers, error } = await supabase.from('Master_Drivers').select('Driver_ID, Driver_Name, Mobile_No, Line_User_ID')
    if (error) {
        console.error(error)
        return
    }

    console.log('--- ALL DRIVERS ---')
    drivers.forEach(d => {
        console.log(`ID: ${d.Driver_ID} | Name: ${d.Driver_Name} | Phone: ${d.Mobile_No} | Line: ${d.Line_User_ID ? 'Bound' : 'No'}`)
    })

    // Check for potential duplicates by name or phone
    const names = drivers.map(d => d.Driver_Name)
    const duplicates = names.filter((item, index) => names.indexOf(item) !== index)
    if (duplicates.length > 0) {
        console.log('\n--- POTENTIAL DUPLICATES (Same Name) ---')
        const uniqueDuplicates = [...new Set(duplicates)]
        uniqueDuplicates.forEach(name => {
            const matches = drivers.filter(d => d.Driver_Name === name)
            console.log(`Name: ${name}`)
            matches.forEach(m => console.log(`  -> ID: ${m.Driver_ID}`))
        })
    }
}

checkDrivers()
