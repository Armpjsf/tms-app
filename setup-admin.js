const { createClient } = require("@supabase/supabase-js");
const argon2 = require("argon2");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables in .env.local");
  console.error(
    "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAdmin(username, password) {
  try {
    console.log(`🚀 Setting up admin user: ${username}...`);

    // 1. Hash the password using Argon2 (same as the app)
    const hashedPassword = await argon2.hash(password);

    // 2. Check if user exists in Master_Users
    const { data: existingUser, error: fetchError } = await supabase
      .from("Master_Users")
      .select("*")
      .eq("Username", username)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingUser) {
      console.log("📝 User already exists. Updating credentials...");
      const updateData = {
        Password: hashedPassword,
        Role: "Super Admin", // Using 'Role' column as found in spec
        Active_Status: "Active",
      };

      const { error: updateError } = await supabase
        .from("Master_Users")
        .update(updateData)
        .eq("Username", username);

      if (updateError) throw updateError;
      console.log("✅ Admin credentials updated successfully!");
    } else {
      console.log("➕ User does not exist. Creating new Admin...");
      const { error: insertError } = await supabase
        .from("Master_Users")
        .insert({
          Username: username,
          Password: hashedPassword,
          Role: "Super Admin",
          First_Name: "System",
          Last_Name: "Admin",
          Email: "admin@example.com",
          Active_Status: "Active",
        });

      if (insertError) throw insertError;
      console.log("✅ Admin user created successfully!");
    }

    console.log("\n---");
    console.log(`Username: ${username}`);
    console.log("Password: (the one you provided)");
    console.log("Role: Super Admin");
    console.log("---\n");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("\n💡 Usage: node setup-admin.js <username> <password>");
  console.log("Example: node setup-admin.js admin 123456\n");
  process.exit(1);
}

setupAdmin(args[0], args[1]);
