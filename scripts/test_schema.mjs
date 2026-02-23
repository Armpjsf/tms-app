import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
async function check() {
  // Unfortunately we can't query information_schema directly via JS client,
  // but we can test a few queries to see what works:
  const q1 = await supabase
    .from("Master_Customers")
    .select("Customer_ID")
    .limit(1);
  console.log(
    "Q1 ('Master_Customers'):",
    q1.error ? q1.error.message : "SUCCESS",
  );

  // The only way to know what postgres expects is by using RPC or asking Supabase via SQL.
  // However, if the error was `relation "public.master_customers" does not exist`,
  // it MUST mean the table is named exactly "Master_Customers" in postgres (with quotes).
  // Because if it was lowercase `master_customers`, then unquoted `public.master_customers` would have matched it.
  // It failed, meaning it does NOT exist as lowercase. It exists as mixed case!
}
check();
