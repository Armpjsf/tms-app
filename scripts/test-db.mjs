import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function test() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customers(Customer_Name)")
    .limit(1);
  console.log("TEST 1 ERROR:", JSON.stringify(error, null, 2));

  const { data: d2, error: e2 } = await supabase
    .from("invoices")
    .select("*, Master_Customers(Customer_Name)")
    .limit(1);
  console.log("TEST 2 ERROR:", JSON.stringify(e2, null, 2));
}

test();
