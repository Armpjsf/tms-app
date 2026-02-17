'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type VehicleType = {
  type_id: number
  type_name: string
  description: string | null
  active_status: string
  created_at?: string
}

export async function getVehicleTypes() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('Master_Vehicle_Types')
    .select('*')
    .order('type_id', { ascending: true })

  if (error) {
    console.error('Error fetching vehicle types:', error)
    return []
  }

  return data as VehicleType[]
}

export async function createVehicleType(data: { type_name: string; description?: string }) {
  const supabase = await createClient()

  // Check for duplicate name
  const { data: existing } = await supabase
    .from('Master_Vehicle_Types')
    .select('type_id')
    .eq('type_name', data.type_name)
    .single()

  if (existing) {
    return { success: false, message: 'ชื่อประเภทรถนี้มีอยู่แล้ว' }
  }

  const { error } = await supabase
    .from('Master_Vehicle_Types')
    .insert({
      type_name: data.type_name,
      description: data.description || null,
      active_status: 'Active'
    })

  if (error) {
    console.error('Error creating vehicle type:', error)
    return { success: false, message: `Failed to create: ${error.message}` }
  }

  revalidatePath('/settings/vehicle-types')
  revalidatePath('/vehicles') // Update vehicle dialog
  return { success: true, message: 'เพิ่มประเภทรถสำเร็จ' }
}

export async function updateVehicleType(id: number, data: { type_name: string; description?: string; active_status?: string }) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Vehicle_Types')
    .update({
      type_name: data.type_name,
      description: data.description,
      active_status: data.active_status
    })
    .eq('type_id', id)

  if (error) {
    console.error('Error updating vehicle type:', error)
    return { success: false, message: `Failed to update: ${error.message}` }
  }

  revalidatePath('/settings/vehicle-types')
  revalidatePath('/vehicles')
  return { success: true, message: 'บันทึกข้อมูลสำเร็จ' }
}

export async function deleteVehicleType(id: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('Master_Vehicle_Types')
    .delete()
    .eq('type_id', id)

  if (error) {
    console.error('Error deleting vehicle type:', error)
    return { success: false, message: `Failed to delete: ${error.message}` }
  }

  revalidatePath('/settings/vehicle-types')
  revalidatePath('/vehicles')
  return { success: true, message: 'ลบข้อมูลสำเร็จ' }
}
