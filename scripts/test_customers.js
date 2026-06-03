const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('Jobs_Main').select('Job_ID, Customer_ID, Customer_Name').limit(10);
  if (error) {
    console.error("Error fetching jobs:", error);
  } else {
    console.log("Jobs in DB:", data);
  }
}

run();
