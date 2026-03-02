const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function diagnose() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  console.log("--- Job Status Distribution (Total) ---");
  const { data: statuses, error } = await supabase
    .from("Jobs_Main")
    .select("Job_Status");
  if (error) {
    console.error("Error fetching statuses:", error);
    return;
  }
  const counts = {};
  statuses?.forEach((s) => {
    const status = s.Job_Status || "NULL";
    counts[status] = (counts[status] || 0) + 1;
  });
  console.log(counts);

  console.log("\n--- Recent Jobs Sample ---");
  const { data: recent } = await supabase
    .from("Jobs_Main")
    .select("Plan_Date, Job_Status, Price_Cust_Total")
    .limit(10)
    .order("Plan_Date", { ascending: false });
  console.log(recent);

  console.log("\n--- Checking specific statuses from analytics.ts ---");
  const targetStatuses = ["Completed", "Delivered", "Finished", "Closed"];
  for (const status of targetStatuses) {
    const { count } = await supabase
      .from("Jobs_Main")
      .select("*", { count: "exact", head: true })
      .eq("Job_Status", status);
    console.log(`${status}: ${count}`);
  }
}

diagnose();
