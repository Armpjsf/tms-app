'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'

export type VehicleFormData = {
  vehicle_plate: string
  vehicle_type: string
  brand: string
  model: string
  active_status: string
  current_mileage?: number
  next_service_mileage?: number
  Branch_ID?: string
}

export async function createVehicle(data: VehicleFormData) {
  const supabase = await createClient()
  const userBranchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  const finalBranchId = (isAdmin && data.Branch_ID) ? data.Branch_ID : userBranchId
  
  console.log('[createVehicle] Attempting to create vehicle:', { 
      plate: data.vehicle_plate, 
      finalBranchId, 
      userBranchId,
      isAdmin 
  })

  const { error } = await supabase
    .from('master_vehicles')
    .insert({
      vehicle_plate: data.vehicle_plate,
      vehicle_type: data.vehicle_type,
      brand: data.brand,
      model: data.model,
      active_status: 'Active',
      current_mileage: data.current_mileage || 0,
      next_service_mileage: data.next_service_mileage || 0,
      branch_id: finalBranchId
    })

  if (error) {
    console.error('[createVehicle] DB Error:', error)
    return { success: false, message: 'Failed to create vehicle' }
  }

  console.log('[createVehicle] Success')
  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle created successfully' }
}

export async function createBulkVehicles(vehicles: any[]) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()

  // Helper to normalize keys
  const normalizeData = (row: any) => {
    const normalized: any = {}
    
    // Helper to find value by possible keys (case-insensitive)
    const getValue = (keys: string[]) => {
      const rowKeys = Object.keys(row)
      for (const key of keys) {
        const foundKey = rowKeys.find(k => k.toLowerCase().replace(/\s+/g, '') === key.toLowerCase().replace(/\s+/g, ''))
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return row[foundKey]
        }
      }
      return undefined
    }

    // Mapping rules
    normalized.vehicle_plate = getValue(['vehicle_plate', 'plate', 'ทะเบียน', 'ทะเบียนรถ', 'license_plate', 'licenseplate'])
    normalized.vehicle_type = getValue(['vehicle_type', 'type', 'ประเภท', 'ประเภทรถ', 'vehicletype']) || '4-Wheel'
    normalized.brand = getValue(['brand', 'make', 'ยี่ห้อ'])
    normalized.model = getValue(['model', 'รุ่น'])
    normalized.active_status = getValue(['active_status', 'status', 'สถานะ']) || 'Active'
    normalized.current_mileage = getValue(['current_mileage', 'mileage', 'เลขไมล์', 'currentmileage']) || 0
    normalized.next_service_mileage = getValue(['next_service_mileage', 'next_service', 'เช็คระยะถัดไป', 'nextservicemileage', 'nextservice']) || 0
    
    // Keep internal fields
    if (row.Branch_ID) normalized.Branch_ID = row.Branch_ID

    return normalized
  }

  // Prepare data
  const cleanData = vehicles.map(v => {
    const data = normalizeData(v)
    return {
      vehicle_plate: data.vehicle_plate ? String(data.vehicle_plate).trim() : null,
      vehicle_type: data.vehicle_type,
      brand: data.brand,
      model: data.model,
      active_status: data.active_status,
      current_mileage: Number(data.current_mileage) || 0,
      next_service_mileage: Number(data.next_service_mileage) || 0,
      branch_id: branchId
    }
  }).filter(v => v.vehicle_plate) // Filter out rows without active_status or vehicle_plate

  // Deduplicate input data by vehicle_plate
  const uniqueData = Array.from(new Map(cleanData.map(item => [item.vehicle_plate, item])).values())

  console.log('[createBulkVehicles] Input:', vehicles.length, 'Clean:', cleanData.length, 'Unique:', uniqueData.length)

  if (uniqueData.length === 0) {
     return { success: false, message: 'ไม่พบข้อมูลที่ถูกต้อง (กรุณาตรวจสอบชื่อคอลัมน์ เช่น ทะเบียนรถ, ยี่ห้อ, รุ่น)' }
  }

  // Use upsert to handle duplicates (update existing or insert new)
  const { error } = await supabase
    .from('master_vehicles')
    .upsert(uniqueData, { 
      onConflict: 'vehicle_plate',
      ignoreDuplicates: false // Update if exists
    })
    .select()

  if (error) {
    console.error('Error bulk creating vehicles:', error)
    return { success: false, message: `นำเข้าไม่สำเร็จ: ${error.message}` }
  }

  revalidatePath('/vehicles')
  return { success: true, message: `นำเข้าข้อมูลสำเร็จ ${uniqueData.length} รายการ` }
}

export async function updateVehicle(plate: string, data: Partial<VehicleFormData>) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

    const updatePayload: any = {
        vehicle_type: data.vehicle_type,
        brand: data.brand,
        model: data.model,
        active_status: data.active_status,
        current_mileage: data.current_mileage,
        next_service_mileage: data.next_service_mileage
    }

    if (isAdmin && data.Branch_ID) {
        updatePayload.branch_id = data.Branch_ID
    }

    let query = supabase
      .from('master_vehicles')
      .update(updatePayload)
  
  query = query.eq('vehicle_plate', plate)

  if (branchId && !isAdmin) {
      query = query.eq('branch_id', branchId)
  }

  const { error } = await query

  if (error) {
    console.error('Error updating vehicle:', error)
    return { success: false, message: 'Failed to update vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle updated successfully' }
}

export async function deleteVehicle(plate: string) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  let query = supabase
    .from('master_vehicles')
    .delete()
    .eq('vehicle_plate', plate)

  if (branchId && !isAdmin) {
      query = query.eq('branch_id', branchId)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting vehicle:', error)
    return { success: false, message: 'Failed to delete vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle deleted successfully' }
}
