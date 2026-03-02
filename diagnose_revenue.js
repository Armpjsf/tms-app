const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function diagnose() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const startDate = "2026-02-01";
  const endDate = "2026-02-28";
  const branchId = "PTE";
  const revenueStatuses = ["Completed", "Delivered", "Finished", "Closed"];

  console.log(
    `Searching for: ${startDate} to ${endDate} for branch ${branchId}`,
  );

  let jobsQuery = supabase
    .from("Jobs_Main")
    .select(
      "Price_Cust_Total, Cost_Driver_Total, Extra_Cost_Amount, Toll_Amount, Job_Status, Branch_ID",
    )
    .gte("Plan_Date", startDate)
    .lte("Plan_Date", endDate)
    .in("Job_Status", revenueStatuses)
    .eq("Branch_ID", branchId);

  const { data: jobs, error } = await jobsQuery;

  if (error) {
    console.error("Jobs Error:", error);
  } else {
    console.log(`Found ${jobs?.length || 0} jobs`);
    const revenue =
      jobs?.reduce((sum, job) => sum + (job.Price_Cust_Total || 0), 0) || 0;
    console.log(`Calculated Revenue: ${revenue}`);
    if (jobs && jobs.length > 0) {
      console.log("Sample Job:", jobs[0]);
    }
  }

  // Checking if branch filtering is case sensitive or has issues
  console.log("\nChecking with Case-Insensitive Branch Name if applicable?");
  // (PTE)
}

diagnose();
