
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function listTables() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabase.rpc('get_tables_info'); 
  // If rpc doesn't exist, try a direct query via a common table
  
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (tableError) {
    console.error('Error fetching tables:', tableError.message);
    // Try another way: just query the three tables specifically with lowercase names
    const testNames = ['fleet_fuel_standards', 'fleet_maintenance_standards', 'fleet_intelligence_alerts'];
    for (const name of testNames) {
        const { error: e } = await supabase.from(name).select('*', { count: 'exact', head: true });
        console.log(`Checking ${name}: ${e ? 'ERROR: ' + e.message : 'EXISTS'}`);
    }
  } else {
    console.log('Tables in public schema:', tables.map(t => t.table_name));
  }
}

listTables();
