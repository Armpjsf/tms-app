import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
    console.log('Inspecting Supabase Schemas...')
    
    // 1. Master_Drivers
    const { data: driver, error: driverErr } = await supabase.from('Master_Drivers').select('*').limit(1)
    if (driverErr) console.error('Driver error:', driverErr)
    else console.log('Master_Drivers columns:', driver && driver[0] ? Object.keys(driver[0]) : 'No data (empty table)')

    // 2. Master_Vehicles
    const { data: vehicle, error: vehicleErr } = await supabase.from('Master_Vehicles').select('*').limit(1)
    if (vehicleErr) console.error('Vehicle error:', vehicleErr)
    else console.log('Master_Vehicles columns:', vehicle && vehicle[0] ? Object.keys(vehicle[0]) : 'No data (empty table)')

    // 3. Master_Routes
    const { data: route, error: routeErr } = await supabase.from('Master_Routes').select('*').limit(1)
    if (routeErr) console.error('Route error:', routeErr)
    else console.log('Master_Routes columns:', route && route[0] ? Object.keys(route[0]) : 'No data (empty table)')
}

inspect().catch(console.error)
