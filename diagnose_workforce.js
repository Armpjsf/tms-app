const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function diagnoseWorkforce() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const branchId = "PTE";

  console.log(`--- Checking Drivers for branch: ${branchId} ---`);
  const { data: drivers, error } = await supabase
    .from("Master_Drivers")
    .select("*")
    .eq("Branch_ID", branchId);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Total Drivers found: ${drivers.length}`);
    if (drivers.length > 0) {
      console.log("Sample Driver Expiries:", {
        Insurance: drivers[0].Insurance_Expiry,
        Tax: drivers[0].Tax_Expiry,
        Act: drivers[0].Act_Expiry,
        Expire_Date: drivers[0].Expire_Date,
      });
    }
  }

  console.log(`\n--- Checking Active Today (Jobs_Main) ---`);
  const today = new Date().toISOString().split("T")[0];
  const { data: activeJobs } = await supabase
    .from("Jobs_Main")
    .select("Driver_ID")
    .eq("Plan_Date", today)
    .eq("Branch_ID", branchId)
    .neq("Job_Status", "Cancelled")
    .not("Driver_ID", "is", null);

  console.log(`Jobs today for ${branchId}: ${activeJobs?.length || 0}`);
}

diagnoseWorkforce();
