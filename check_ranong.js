const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: branches, error: e1 } = await supabase.from('Master_Branches').select('*');
  console.log('Branches:', JSON.stringify(branches, null, 2));
  
  const { data: users, error: e2 } = await supabase.from('Master_Users').select('Username, Role, Branch_ID, Name').ilike('Branch_ID', '%ระนอง%');
  console.log('Ranong Users (Thai):', users);
  
  const { data: users2, error: e3 } = await supabase.from('Master_Users').select('Username, Role, Branch_ID, Name').ilike('Branch_ID', '%Ranong%');
  console.log('Ranong Users (Eng):', users2);

  const { data: allUsers } = await supabase.from('Master_Users').select('Username, Role, Branch_ID, Name').order('created_at', { ascending: false }).limit(5);
  console.log('Recent Users:', allUsers);
}

run();
