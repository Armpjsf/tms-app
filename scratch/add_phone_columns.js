const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addPhoneColumns() {
    console.log('Adding phone columns to Master_Routes...');
    
    // Check if columns exist first
    const { data: columns, error: schemaError } = await supabase
        .from('Master_Routes')
        .select('*')
        .limit(1);

    if (schemaError) {
        console.error('Schema check error:', schemaError);
        return;
    }

    const hasOriginPhone = columns && columns.length > 0 && 'Origin_Phone' in columns[0];
    const hasDestPhone = columns && columns.length > 0 && 'Dest_Phone' in columns[0];

    if (hasOriginPhone && hasDestPhone) {
        console.log('Columns already exist.');
        return;
    }

    // Since we don't have direct SQL access through the client, 
    // we hope the user can run this or we try to use a RPC if available.
    // In many of these environments, we can't run ALTER TABLE.
    // However, I can check if there's an RPC to run SQL.
    
    console.log('Please run the following SQL in Supabase Dashboard:');
    console.log('ALTER TABLE "Master_Routes" ADD COLUMN IF NOT EXISTS "Origin_Phone" TEXT;');
    console.log('ALTER TABLE "Master_Routes" ADD COLUMN IF NOT EXISTS "Dest_Phone" TEXT;');
}

addPhoneColumns();
