import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  const { data, error } = await supabase
    .from('Master_Vehicle_Types')
    .insert({
      type_name: 'Test Vehicle',
      description: 'Test description',
      active_status: 'Active'
    })
    .select()

  console.log('Error:', error)
  console.log('Data:', data)
}

testInsert()
