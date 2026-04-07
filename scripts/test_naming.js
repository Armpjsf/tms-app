
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkCase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const testCases = [
    'Fleet_Fuel_Standards', 
    'fleet_fuel_standards',
    '"Fleet_Fuel_Standards"'
  ];

  for (const name of testCases) {
    const { error, count } = await supabase.from(name).select('*', { count: 'exact', head: true });
    console.log(`Checking ${name}: ${error ? 'ERROR: ' + error.message : 'EXISTS (Count: ' + count + ')'}`);
  }
}

checkCase();
