const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkSchemas() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  console.log("--- master_vehicles Sample ---");
  const { data: v, error: ve } = await supabase
    .from("master_vehicles")
    .select("*")
    .limit(1);
  if (ve) console.error(ve);
  else if (v && v.length > 0) console.log("Columns:", Object.keys(v[0]));

  console.log("\n--- Fuel_Logs Sample ---");
  const { data: f, error: fe } = await supabase
    .from("Fuel_Logs")
    .select("*")
    .limit(1);
  if (fe) console.error(fe);
  else if (f && f.length > 0) console.log("Columns:", Object.keys(f[0]));
}

checkSchemas();
