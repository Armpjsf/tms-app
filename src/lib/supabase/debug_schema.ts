
import { createClient } from '@/utils/supabase/server'

export async function listTables() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')

  if (error) {
    console.error('Error listing tables:', error)
    // Fallback: try querying likely table names directly
    const { error: branchError } = await supabase.from('master_branches').select('count', { count: 'exact', head: true })
    if (!branchError) console.log("Found table: master_branches")
    
    const { error: mbError } = await supabase.from('Master_Branches').select('count', { count: 'exact', head: true })
    if (!mbError) console.log("Found table: Master_Branches")

    const { error: bError } = await supabase.from('branches').select('count', { count: 'exact', head: true })
    if (!bError) console.log("Found table: branches")
  } else {
    console.log('Tables:', data)
  }
}
