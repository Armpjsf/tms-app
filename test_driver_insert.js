const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const driverData = {
      Driver_ID: 'TEST_DRV_' + Date.now(),
      Driver_Name: 'Test Driver',
      Mobile_No: '0812345678',
      Password: '123456',
      Vehicle_Plate: '1กข 1234',
      Vehicle_Type: '4-Wheel',
      Role: 'Driver',
      Active_Status: 'Active',
      Sub_ID: null,
      Bank_Name: null,
      Bank_Account_No: null,
      Bank_Account_Name: null,
      Branch_ID: 'ESA'
  };

  const { data, error } = await supabase
    .from('Master_Drivers')
    .insert(driverData)
    .select();

  console.log('Driver Insert Error:', JSON.stringify(error, null, 2));
  console.log('Driver Insert Data:', JSON.stringify(data, null, 2));
  
  if (data) {
     // Clean up
     await supabase.from('Master_Drivers').delete().eq('Driver_ID', driverData.Driver_ID);
  }
}

run();
