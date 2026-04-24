
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const standardTypes = [
    { type_name: '4-Wheel', description: 'รถกระบะ 4 ล้อ', active_status: 'Active' },
    { type_name: '6-Wheel', description: 'รถบรรทุก 6 ล้อ', active_status: 'Active' },
    { type_name: '10-Wheel', description: 'รถบรรทุก 10 ล้อ', active_status: 'Active' },
    { type_name: 'Trailer', description: 'รถเทรลเลอร์', active_status: 'Active' },
    { type_name: 'Motorcycle', description: 'รถจักรยานยนต์', active_status: 'Active' }
]

async function seedVehicleTypes() {
    console.log('🌱 Seeding standard vehicle types...')
    const { error } = await supabase
        .from('Master_Vehicle_Types')
        .upsert(standardTypes, { onConflict: 'type_name' })
    
    if (error) console.error('Error seeding:', error.message)
    else console.log('✅ Vehicle types seeded successfully.')
}

seedVehicleTypes()
