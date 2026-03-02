const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // Select one row to see all available keys
  const { data, error } = await supabase.from("Jobs_Main").select("*").limit(1);
  if (error) {
    console.error("Schema Error:", error);
  } else if (data && data.length > 0) {
    console.log("Columns in Jobs_Main:", Object.keys(data[0]));
  } else {
    console.log("No data in Jobs_Main to check columns.");
  }
}

checkSchema();
