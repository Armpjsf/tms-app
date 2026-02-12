import { createClient } from "@/utils/supabase/client"

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const supabase = createClient()
  
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
  } catch (e) {
      return data.value as T
  }
}

export async function saveSetting<T>(key: string, value: T, description: string = '') {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('System_Settings')
    .upsert({ 
        key, 
        value: JSON.stringify(value),
        description
    }, { onConflict: 'key' })

  return { success: !error, error }
}
