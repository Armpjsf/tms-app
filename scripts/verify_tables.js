
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkFleetTables() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const tables = ['Fleet_Fuel_Standards', 'Fleet_Maintenance_Standards', 'Fleet_Intelligence_Alerts'];
  
  console.log('Checking connection to:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`Error checking ${table}:`, error.message);
    } else {
      console.log(`Table ${table} exists. Row count: ${count}`);
    }
  }
}

checkFleetTables();
