
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testJobsMain() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const testCases = ['Jobs_Main', 'jobs_main', '"Jobs_Main"'];
  for (const name of testCases) {
    const { error, count } = await supabase.from(name).select('*', { count: 'exact', head: true });
    console.log(`Checking ${name}: ${error ? 'ERROR' : 'EXISTS (Count: ' + count + ')'}`);
  }
}

testJobsMain();
