import { createClient } from "@/utils/supabase/server"

export async function getServerSetting<T>(key: string, defaultValue: T): Promise<T> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('System_Settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    return defaultValue
  }

  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch {
    return data.value as T
  }
}

export async function saveServerSetting<T>(key: string, value: T, description: string = '') {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('System_Settings')
    .upsert({ 
        key, 
        value: typeof value === 'string' ? value : JSON.stringify(value),
        description
    }, { onConflict: 'key' })

  return { success: !error, error }
}
