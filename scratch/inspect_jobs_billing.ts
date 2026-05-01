
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function inspectJobs() {
    console.log("Inspecting jobs for Apr 21-23...")
    const { data, error } = await supabase
        .from('Jobs_Main')
        .select('Job_ID, Plan_Date, Customer_ID, Route_Name, Vehicle_Type, Price_Per_Unit, Price_Cust_Total, Loaded_Qty')
        .gte('Plan_Date', '2026-04-21')
        .lte('Plan_Date', '2026-04-23')
    
    if (error) {
        console.error(error)
        return
    }

    console.log(`Found ${data?.length} jobs.`)
    data?.forEach(j => {
        console.log(`ID: ${j.Job_ID} | Date: ${j.Plan_Date} | Cust: ${j.Customer_ID} | Route: ${j.Route_Name} | Vehicle: ${j.Vehicle_Type} | UnitPrice: ${j.Price_Per_Unit} | Total: ${j.Price_Cust_Total} | Qty: ${j.Loaded_Qty}`)
    })
}

inspectJobs()
