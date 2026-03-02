const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function diagnose() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  console.log("--- Job Branch Distribution ---");
  const { data: branches } = await supabase
    .from("Jobs_Main")
    .select("Branch_ID");
  const counts = {};
  branches?.forEach((b) => {
    const bid = b.Branch_ID || "NULL";
    counts[bid] = (counts[bid] || 0) + 1;
  });
  console.log(counts);

  console.log("\n--- Checking Feb 2026 specifically ---");
  const { data: febJobs, error: febError } = await supabase
    .from("Jobs_Main")
    .select("Price_Cust_Total, Job_Status")
    .gte("Plan_Date", "2026-02-01")
    .lte("Plan_Date", "2026-02-28");

  if (febError) console.error(febError);
  const febCompleted =
    febJobs?.filter((j) => j.Job_Status === "Completed") || [];
  const totalRevenue = febCompleted.reduce(
    (a, b) => a + (b.Price_Cust_Total || 0),
    0,
  );
  console.log(`Feb Jobs Total: ${febJobs?.length}`);
  console.log(`Feb Completed Jobs: ${febCompleted.length}`);
  console.log(`Feb Revealed Revenue: ${totalRevenue}`);
}

diagnose();
