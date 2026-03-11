'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserBranchId, isSuperAdmin } from '@/lib/permissions'
import { Vehicle } from "@/lib/supabase/vehicles"

export type VehicleFormData = {
  vehicle_plate: string
  vehicle_type: string
  brand: string
  model: string
  active_status: string
  current_mileage?: number
  next_service_mileage?: number
  tax_expiry?: string
  insurance_expiry?: string
  act_expiry?: string
  Branch_ID?: string
  sub_id?: string
  max_weight_kg?: number
  max_volume_cbm?: number
}

export async function createVehicle(data: VehicleFormData) {
  const supabase = await createClient()
  const userBranchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

  const finalBranchId = (isAdmin && data.Branch_ID) ? data.Branch_ID : userBranchId
  

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
      tax_expiry: data.tax_expiry,
      insurance_expiry: data.insurance_expiry,
      act_expiry: data.act_expiry,
      sub_id: data.sub_id,
      max_weight_kg: data.max_weight_kg,
      max_volume_cbm: data.max_volume_cbm,
      branch_id: finalBranchId
    })

  if (error) {
    return { success: false, message: 'Failed to create vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle created successfully' }
}

export async function createBulkVehicles(vehicles: Vehicle[]) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()

  // Helper to normalize keys
  const normalizeData = (row: Vehicle) => {
    const normalized: Partial<Vehicle> = {}
    
    // Helper to find value by possible keys (case-insensitive)
    const getValue = (keys: string[]) => {
      const rowKeys = Object.keys(row)
      for (const key of keys) {
        const foundKey = rowKeys.find(k => k.toLowerCase().replace(/\s+/g, '') === key.toLowerCase().replace(/\s+/g, ''))
        const rowAsRecord = row as unknown as Record<string, unknown>
        if (foundKey && rowAsRecord[foundKey] !== undefined && rowAsRecord[foundKey] !== null) {
          return rowAsRecord[foundKey]
        }
      }
      return undefined
    }

    // Mapping rules
    normalized.vehicle_plate = getValue(['vehicle_plate', 'plate', 'ทะเบียน', 'ทะเบียนรถ', 'license_plate', 'licenseplate']) as string
    normalized.vehicle_type = (getValue(['vehicle_type', 'type', 'ประเภท', 'ประเภทรถ', 'vehicletype']) as string) || '4-Wheel'
    normalized.brand = getValue(['brand', 'make', 'ยี่ห้อ']) as string
    normalized.model = getValue(['model', 'รุ่น']) as string
    normalized.active_status = (getValue(['active_status', 'status', 'สถานะ']) as string) || 'Active'
    normalized.current_mileage = (getValue(['current_mileage', 'mileage', 'เลขไมล์', 'currentmileage']) as number) || 0
    normalized.next_service_mileage = (getValue(['next_service_mileage', 'next_service', 'เช็คระยะถัดไป', 'nextservicemileage', 'nextservice']) as number) || 0
    
    // Compliance Dates
    normalized.tax_expiry = getValue(['tax_expiry', 'tax_date', 'ภาษี', 'วันหมดอายุภาษี']) as string
    normalized.insurance_expiry = getValue(['insurance_expiry', 'insurance_date', 'ประกันภัย', 'วันหมดอายุประกัน']) as string
    normalized.act_expiry = getValue(['act_expiry', 'act_date', 'พรบ', 'วันหมดอายุพรบ']) as string
    
    // Specs
    normalized.max_weight_kg = getValue(['max_weight_kg', 'max_weight', 'น้ำหนักบรรทุก', 'capacity_kg']) as number
    normalized.max_volume_cbm = getValue(['max_volume_cbm', 'max_volume', 'ปริมาตรบรรทุก', 'capacity_cbm']) as number
    
    // Keep internal fields
    const rowAsRecord = row as unknown as Record<string, unknown>
    if (rowAsRecord.branch_id) normalized.branch_id = rowAsRecord.branch_id as string

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
      tax_expiry: data.tax_expiry,
      insurance_expiry: data.insurance_expiry,
      act_expiry: data.act_expiry,
      max_weight_kg: Number(data.max_weight_kg) || null,
      max_volume_cbm: Number(data.max_volume_cbm) || null,
      branch_id: branchId
    }
  }).filter(v => v.vehicle_plate) // Filter out rows without active_status or vehicle_plate

  // Deduplicate input data by vehicle_plate
  const uniqueData = Array.from(new Map(cleanData.map(item => [item.vehicle_plate, item])).values())


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
    return { success: false, message: `นำเข้าไม่สำเร็จ: ${error.message}` }
  }

  revalidatePath('/vehicles')
  return { success: true, message: `นำเข้าข้อมูลสำเร็จ ${uniqueData.length} รายการ` }
}

export async function updateVehicle(plate: string, data: Partial<VehicleFormData>) {
  const supabase = await createClient()
  const branchId = await getUserBranchId()
  const isAdmin = await isSuperAdmin()

    const updatePayload: Partial<Vehicle> = {
        vehicle_type: data.vehicle_type,
        brand: data.brand,
        model: data.model,
        active_status: data.active_status,
        current_mileage: data.current_mileage,
        next_service_mileage: data.next_service_mileage,
        tax_expiry: data.tax_expiry,
        insurance_expiry: data.insurance_expiry,
        act_expiry: data.act_expiry,
        sub_id: data.sub_id,
        max_weight_kg: data.max_weight_kg,
        max_volume_cbm: data.max_volume_cbm
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
    return { success: false, message: 'Failed to delete vehicle' }
  }

  revalidatePath('/vehicles')
  return { success: true, message: 'Vehicle deleted successfully' }
}
