
import { createAdminClient } from './src/utils/supabase/server'

async function checkFleetTables() {
  const supabase = createAdminClient()
  
  const tables = ['Fleet_Fuel_Standards', 'Fleet_Maintenance_Standards', 'Fleet_Intelligence_Alerts']
  
  for (const table of tables) {
    console.log(`Checking table: ${table}...`)
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(1)
    
    if (error) {
      console.error(`Error checking ${table}:`, error.message)
    } else {
      console.log(`Table ${table} exists and has data/structure.`)
    }
  }
}

checkFleetTables()
