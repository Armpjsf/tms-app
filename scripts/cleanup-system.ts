
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanup() {
    console.log('🚀 Final stage of production cleanup (Null-safe delete)...')
    
    const finalizeList = [
        { table: 'System_Logs', pk: 'id' },
        { table: 'Chat_Messages', pk: 'id' },
        { table: 'Push_Subscriptions', pk: 'ID' },
        { table: 'Master_Expense_Types', pk: 'Expense_Type_ID' },
        { table: 'Master_Vehicle_Types', pk: 'type_id' },
        { table: 'daily_fuel_prices', pk: 'Date' }
    ]

    for (const item of finalizeList) {
        process.stdout.write(`Clearing ${item.table}... `)
        const { error } = await supabase.from(item.table).delete().not(item.pk, 'is', null)
        if (error) console.log(`ERROR: ${error.message}`)
        else console.log('DONE ✅')
    }
    
    console.log('\n✨ Cleanup completed.')
}

cleanup()
