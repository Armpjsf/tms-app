import { createAdminClient } from "./utils/supabase/server.js";

async function debugTracking() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  console.log("Searching for Plan_Date:", today);

  const { data, error, count } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Job_Status, Plan_Date, Branch_ID', { count: 'exact' })
    .eq('Plan_Date', today)
    .limit(10);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found today jobs count:", count);
  console.log("Sample Data:", data);

  // Check overall counts
  const { count: totalCount } = await supabase.from('Jobs_Main').select('*', { count: 'exact', head: true });
  console.log("Total Jobs in Table:", totalCount);
}

debugTracking();
