
const { createClient } = require('@supabase/supabase-js');
const argon2 = require('argon2');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdmin() {
  const newPassword = '123456';
  const hashedPassword = await argon2.hash(newPassword);

  console.log('--- 🟢 Fixing Admin Password ---');
  console.log('Username: admin');
  console.log('New Hashed Password:', hashedPassword);

  // Check if admin exists
  const { data: user, error: fetchError } = await supabase
    .from('Master_Users')
    .select('*')
    .eq('Username', 'admin')
    .single();

  if (fetchError || !user) {
    console.log('Admin user not found, creating new admin...');
    const { error: insertError } = await supabase
      .from('Master_Users')
      .insert([{
        Username: 'admin',
        Password: hashedPassword,
        Role: 'Super Admin',
        Role_ID: 1,
        Name: 'System Administrator',
        Branch_ID: 'HQ',
        Active_Status: 'Active'
      }]);
    
    if (insertError) console.error('❌ Insert Error:', insertError.message);
    else console.log('✅ Admin user created successfully');
  } else {
    console.log('Admin user found, updating password...');
    const { error: updateError } = await supabase
      .from('Master_Users')
      .update({ Password: hashedPassword })
      .eq('Username', 'admin');

    if (updateError) console.error('❌ Update Error:', updateError.message);
    else console.log('✅ Admin password updated successfully');
  }

  console.log('\n🏁 Done.');
}

fixAdmin();
