
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscriptions() {
  const { data, count, error } = await supabase
    .from('Push_Subscriptions')
    .select('*', { count: 'exact' });

  if (error) {
    console.log(JSON.stringify({ error: error.message }));
    return;
  }

  const result = {
    total: count,
    subscriptions: data.map(s => ({
        driver: s.Driver_ID,
        type: s.Keys_Auth === 'FCM' ? 'FCM' : 'WebPush',
        updated: s.Updated_At
    }))
  };
  console.log(JSON.stringify(result, null, 2));
}

checkSubscriptions();
