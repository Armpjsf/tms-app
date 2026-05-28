const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugTracking() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().split('T')[0];
  console.log("Searching for Plan_Date:", today);

  const { data, error, count } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Job_Status, Plan_Date, Branch_ID', { count: 'exact' })
    .eq('Plan_Date', today)
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found today jobs count:", count);
  console.log("Sample Data:", data);

  // Check the latest dates available in the system
  const { data: latestDates } = await supabase
    .from('Jobs_Main')
    .select('Plan_Date')
    .order('Plan_Date', { ascending: false })
    .limit(5);
  
  console.log("Latest Plan_Dates in DB:", latestDates);
}

debugTracking();
