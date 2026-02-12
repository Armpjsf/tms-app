import { createClient } from "@/utils/supabase/client"

export interface CompanyProfile {
  company_name: string
  company_name_en: string
  tax_id: string
  branch: string
  address: string
  phone: string
  fax: string
  email: string
  website: string
  bank_name: string
  bank_account_name: string
  bank_account_no: string
  logo_url: string
}

const SETTING_KEY = 'company_profile'

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('System_Settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .single()

  if (error) {
    console.error('Error fetching company profile:', error)
    return null
  }

  // Parse JSON if stored as text, or return distinct object if jsonb
  try {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch (e) {
      return data.value
  }
}

export async function saveCompanyProfile(profile: CompanyProfile) {
  const supabase = createClient()
  
  // Upsert
  const { error } = await supabase
    .from('System_Settings')
    .upsert({ 
        key: SETTING_KEY, 
        value: JSON.stringify(profile),
        description: 'Company Profile Data'
    }, { onConflict: 'key' })

  return { success: !error, error }
}

export async function uploadCompanyLogo(file: File) {
  const supabase = createClient()
  const fileName = `company-logo-${Date.now()}.${file.name.split('.').pop()}`

  const { error } = await supabase
    .storage
    .from('company-assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading logo:', error)
    return { success: false, error }
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('company-assets')
    .getPublicUrl(fileName)

  return { success: true, url: publicUrl }
}
