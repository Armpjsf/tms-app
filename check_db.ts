import { createAdminClient } from './src/utils/supabase/server'

async function checkCount() {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('Jobs_Main')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('Connection Error:', error)
  } else {
    console.log('Total rows in Jobs_Main:', count)
  }
}

checkCount()
