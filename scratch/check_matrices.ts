
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkMatrices() {
    console.log("Checking All Route Matrices Content...")
    const { data: matrix, error } = await supabase
        .from('Customer_Route_Rates')
        .select('*')
    
    if (error) console.error(error)
    else console.log(JSON.stringify(matrix, null, 2))
}

checkMatrices()
