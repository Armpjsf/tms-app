const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Path to .env.local
const envPath = path.join(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded .env.local");
} else {
  console.warn(".env.local not found, using system environment variables");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_PERMISSIONS = {
  Admin: {
    job_view: true,
    job_create: true,
    job_delete: true,
    job_export: true,
    job_price_view: true,
    job_price_edit: true,
    fleet_view: true,
    fleet_edit: true,
    fleet_service: true,
    fleet_fuel: true,
    billing_view: true,
    billing_create: true,
    billing_approve: true,
    settings_user: true,
    settings_company: true,
    settings_audit: true,
  },
  Dispatcher: {
    job_view: true,
    job_create: true,
    job_delete: false,
    job_export: true,
    job_price_view: true,
    job_price_edit: false,
    fleet_view: true,
    fleet_edit: true,
    fleet_service: true,
    fleet_fuel: true,
    billing_view: false,
    billing_create: false,
    billing_approve: false,
    settings_user: false,
    settings_company: false,
    settings_audit: false,
  },
  Accountant: {
    job_view: true,
    job_create: false,
    job_delete: false,
    job_export: true,
    job_price_view: true,
    job_price_edit: true,
    fleet_view: true,
    fleet_edit: false,
    fleet_service: false,
    fleet_fuel: true,
    billing_view: true,
    billing_create: true,
    billing_approve: true,
    settings_user: false,
    settings_company: false,
    settings_audit: false,
  },
  Staff: {
    job_view: true,
    job_create: true,
    job_delete: false,
    job_export: false,
    job_price_view: false,
    job_price_edit: false,
    fleet_view: true,
    fleet_edit: false,
    fleet_service: true,
    fleet_fuel: false,
    billing_view: false,
    billing_create: false,
    billing_approve: false,
    settings_user: false,
    settings_company: false,
    settings_audit: false,
  },
  Driver: {
    job_view: true,
    job_create: false,
    job_delete: false,
    job_export: false,
    job_price_view: false,
    job_price_edit: false,
    fleet_view: true,
    fleet_edit: false,
    fleet_service: true,
    fleet_fuel: true,
    billing_view: false,
    billing_create: false,
    billing_approve: false,
    settings_user: false,
    settings_company: false,
    settings_audit: false,
  },
  Customer: {
    job_view: true,
    job_create: false,
    job_delete: false,
    job_export: false,
    job_price_view: false,
    job_price_edit: false,
    fleet_view: false,
    fleet_edit: false,
    fleet_service: false,
    fleet_fuel: false,
    billing_view: true,
    billing_create: false,
    billing_approve: false,
    settings_user: false,
    settings_company: false,
    settings_audit: false,
  },
};

async function seed() {
  console.log("Seeding Master_Role_Permissions...");

  for (const [role, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
    const { error } = await supabase.from("Master_Role_Permissions").upsert(
      {
        Role: role,
        Permissions: perms,
        Updated_At: new Date().toISOString(),
      },
      { onConflict: "Role" },
    );

    if (error) {
      console.error(`Error seeding role ${role}:`, error.message);
    } else {
      console.log(`Successfully seeded role: ${role}`);
    }
  }

  // Also ensure Super Admin exists
  await supabase.from("Master_Role_Permissions").upsert(
    {
      Role: "Super Admin",
      Permissions: DEFAULT_PERMISSIONS.Admin, // Full perms as base
      Updated_At: new Date().toISOString(),
    },
    { onConflict: "Role" },
  );

  console.log("Seeding complete.");
}

seed();
