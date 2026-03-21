"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { isSuperAdmin, isAdmin } from "@/lib/permissions"

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
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  
  const { data, error } = await supabase
    .from('System_Settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .single()

  if (error) {
    return null
  }

  // Parse JSON if stored as text, or return distinct object if jsonb
  try {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch {
      return data.value
  }
}

export async function saveCompanyProfile(profile: CompanyProfile) {
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  
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
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  const fileName = `company-logo-${Date.now()}.${file.name.split('.').pop()}`

  const { error } = await supabase
    .storage
    .from('company-assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    return { success: false, error }
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('company-assets')
    .getPublicUrl(fileName)

  return { success: true, url: publicUrl }
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('System_Settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) return defaultValue
  
  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch {
    return data.value as unknown as T
  }
}

export async function saveSetting(key: string, value: unknown) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('System_Settings')
    .upsert({ 
        key, 
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        updated_at: new Date().toISOString()
    }, { onConflict: 'key' })

  return { success: !error, error }
}
