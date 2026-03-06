const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function diagnose() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const branchId = "PTE";

  console.log("--- Checking Job Plates for Feb 2026 ---");
  const { data: jobs } = await supabase
    .from("Jobs_Main")
    .select("Job_ID, Vehicle_Plate, Plan_Date")
    .gte("Plan_Date", "2026-02-01")
    .lte("Plan_Date", "2026-02-28")
    .eq("Branch_ID", branchId);

  console.log(jobs);

  console.log("\n--- Checking Fuel Logs for Branch PTE ---");
  const { data: fuelLogs } = await supabase
    .from("Fuel_Logs")
    .select("Log_ID, Vehicle_Plate, Liters, Odometer, Date_Time")
    .eq("Branch_ID", branchId)
    .order("Date_Time", { ascending: true });

  console.log(`Found ${fuelLogs?.length || 0} fuel logs`);
  console.log(fuelLogs);
}

diagnose();
