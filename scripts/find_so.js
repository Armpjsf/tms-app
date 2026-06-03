const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function findSO() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  const { data: job } = await supabase
    .from("Jobs_Main")
    .select("Job_ID, Plan_Date, Driver_ID, Driver_Name, Job_Status")
    .eq("Job_ID", "SO123456789,SO987654321,SO112233445,SO566778899")
    .single();

  console.log("Job Details:", job);
}

findSO();
