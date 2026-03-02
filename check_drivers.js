const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkDrivers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  console.log("--- Checking Master_Drivers Table ---");
  const { data: sample, error: schemaError } = await supabase
    .from("Master_Drivers")
    .select("*")
    .limit(1);
  if (schemaError) {
    console.error("Schema Error:", schemaError);
  } else if (sample && sample.length > 0) {
    console.log("Columns in Master_Drivers:", Object.keys(sample[0]));
  } else {
    console.log("No data in Master_Drivers.");
  }

  console.log("\n--- Headcount by Branch ---");
  const { data: branchCounts } = await supabase
    .from("Master_Drivers")
    .select("Branch_ID");
  const counts = {};
  branchCounts?.forEach((b) => {
    const bid = b.Branch_ID || "NULL";
    counts[bid] = (counts[bid] || 0) + 1;
  });
  console.log(counts);
}

checkDrivers();
