const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  console.log("--- total vehicles in PTE ---");
  const { count: c1 } = await supabase
    .from("master_vehicles")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", "PTE");
  const { count: c2 } = await supabase
    .from("master_vehicles")
    .select("*", { count: "exact", head: true })
    .eq("Branch_ID", "PTE");

  console.log(`Using branch_id (lower): ${c1}`);
  console.log(`Using Branch_ID (Upper): ${c2}`);
}

check();
