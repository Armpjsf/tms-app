import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function test() {
  console.log("Fetching from invoices table...");
  const result1 = await supabase.from("invoices").select("*").limit(1);
  fs.writeFileSync("test1.json", JSON.stringify(result1, null, 2));

  console.log("Fetching from Master_Customers table...");
  const result2 = await supabase.from("Master_Customers").select("*").limit(1);
  fs.writeFileSync("test2.json", JSON.stringify(result2, null, 2));
}

test();
