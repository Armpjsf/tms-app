const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function updateSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const sql = `
    ALTER TABLE "Master_Routes" 
    ADD COLUMN IF NOT EXISTS "Origin_Lat" numeric,
    ADD COLUMN IF NOT EXISTS "Origin_Lon" numeric,
    ADD COLUMN IF NOT EXISTS "Dest_Lat" numeric,
    ADD COLUMN IF NOT EXISTS "Dest_Lon" numeric;
  `;

  console.log("Executing SQL...");
  const { data, error } = await supabase.rpc("execute_sql", { sql });

  if (error) {
    console.error("SQL Error:", error);
    process.exit(1);
  }

  console.log("SQL Result:", data);
  console.log("Schema updated successfully.");
}

updateSchema();
