"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin, isAdmin } from "@/lib/permissions"

// Master_Locations = แหล่งข้อมูลสถานที่หลัก (single source)
// การเขียนจะถูก sync ไป Master_Routes อัตโนมัติผ่าน DB trigger
export type Location = {
  Location_ID?: string
  Name: string
  Lat: number | null
  Lon: number | null
  Phone: string | null
  Map_Link: string | null
  Address?: string | null
  Branch_ID: string | null
  Created_At?: string
}

// re-use branch loader
export { getBranches, getCurrentUserRole } from './routes'

// Get all locations (pagination + search + branch isolation)
export async function getAllLocations(page?: number, limit?: number, query?: string, branchId?: string) {
  try {
    const isAdminUser = await isAdmin()
    const supabase = isAdminUser ? createAdminClient() : await createClient()
    let qb = supabase.from('Master_Locations').select('*', { count: 'exact' })

    if (page && limit) {
      const from = (page - 1) * limit
      qb = qb.range(from, from + limit - 1)
    }

    if (query) {
      qb = qb.or(`Name.ilike.%${query}%,Phone.ilike.%${query}%`)
    }

    const userBranchId = await getUserBranchId()
    const isSuper = await isSuperAdmin()

    if (!isSuper) {
      if (userBranchId && userBranchId !== 'All') {
        qb = qb.eq('Branch_ID', userBranchId)
      } else {
        return { data: [], count: 0 }
      }
    } else {
      const targetBranch = branchId || userBranchId
      if (targetBranch && targetBranch !== 'All') {
        qb = qb.eq('Branch_ID', targetBranch)
      }
    }

    const { data, error, count } = await qb.order('Name', { ascending: true })
    if (error) return { data: [], count: 0 }
    return { data: data || [], count: count || 0 }
  } catch {
    return { data: [], count: 0 }
  }
}

// Create location
export async function createLocation(loc: Partial<Location>) {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const supabase = (isSuper || isAdminUser) ? createAdminClient() : await createClient()

    if (!loc.Name || !loc.Name.trim()) {
      return { success: false, error: "Location Name is required" }
    }

    const userBranch = await getUserBranchId()
    const branchId = (isSuper && loc.Branch_ID && loc.Branch_ID !== 'All')
      ? loc.Branch_ID
      : (userBranch !== 'All' ? userBranch : 'HQ')

    const { data, error } = await supabase
      .from('Master_Locations')
      .insert({
        Name: loc.Name.trim(),
        Lat: loc.Lat ?? null,
        Lon: loc.Lon ?? null,
        Phone: loc.Phone ?? null,
        Map_Link: loc.Map_Link ?? null,
        Address: loc.Address ?? null,
        Branch_ID: branchId,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Update location by Location_ID (Name/PK ล็อกไม่ให้แก้ที่ UI)
export async function updateLocation(locationId: string, loc: Partial<Location>) {
  try {
    const isAdminUser = await isAdmin()
    const supabase = isAdminUser ? createAdminClient() : await createClient()

    const patch: Record<string, unknown> = {
      Lat: loc.Lat ?? null,
      Lon: loc.Lon ?? null,
      Phone: loc.Phone ?? null,
      Map_Link: loc.Map_Link ?? null,
      Address: loc.Address ?? null,
    }
    if (loc.Branch_ID) patch.Branch_ID = loc.Branch_ID

    const { data, error } = await supabase
      .from('Master_Locations')
      .update(patch)
      .eq('Location_ID', locationId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Delete location by Location_ID
export async function deleteLocation(locationId: string) {
  try {
    const isAdminUser = await isAdmin()
    const supabase = isAdminUser ? createAdminClient() : await createClient()
    const { error } = await supabase
      .from('Master_Locations')
      .delete()
      .eq('Location_ID', locationId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Bulk import locations (upsert by Name+Branch_ID)
export async function createBulkLocations(rows: Record<string, unknown>[]) {
  try {
    const isSuper = await isSuperAdmin()
    const isAdminUser = await isAdmin()
    const supabase = (isSuper || isAdminUser) ? createAdminClient() : await createClient()
    const currentUserBranch = await getUserBranchId()

    const { data: branches } = await supabase.from('Master_Branches').select('Branch_ID, Branch_Name')
    const branchMap = new Map<string, string>()
    if (branches) {
      branches.forEach((b: { Branch_ID: string; Branch_Name: string }) => {
        branchMap.set(String(b.Branch_Name).trim(), b.Branch_ID)
        branchMap.set(b.Branch_ID, b.Branch_ID)
      })
    }

    const getValue = (row: Record<string, unknown>, keys: string[]) => {
      const rowKeys = Object.keys(row)
      for (const key of keys) {
        const fk = rowKeys.find(k => k.toLowerCase().replace(/\s+/g, '_') === key.toLowerCase().replace(/\s+/g, '_'))
        if (fk && row[fk] !== undefined && row[fk] !== null && String(row[fk]).trim() !== '') return row[fk]
      }
      return undefined
    }

    const prepared = rows.map(r => {
      const name = String(getValue(r, ['name', 'location_name', 'ชื่อสถานที่', 'สถานที่', 'route_name', 'origin']) || '').trim()
      if (!name) return null
      const rawBranch = getValue(r, ['branch_id', 'branch', 'สาขา', 'รหัสสาขา'])
      let branchId = (currentUserBranch && currentUserBranch !== 'All') ? currentUserBranch : 'HQ'
      if (rawBranch) {
        const key = String(rawBranch).trim()
        if (branchMap.has(key)) branchId = branchMap.get(key)!
        else {
          const found = branches?.find((b: { Branch_ID: string; Branch_Name: string }) => {
            const bn = String(b.Branch_Name || '')
            return bn && (bn.includes(key) || key.includes(bn))
          })
          if (found) branchId = found.Branch_ID
        }
      }
      const lat = getValue(r, ['latitude', 'ละติจูด', 'lat', 'origin_lat'])
      const lon = getValue(r, ['longitude', 'ลองจิจูด', 'ลองติจูด', 'lon', 'lng', 'origin_lon'])
      return {
        Name: name,
        Lat: lat ? parseFloat(String(lat)) : null,
        Lon: lon ? parseFloat(String(lon)) : null,
        Phone: (getValue(r, ['phone', 'เบอร์ติดต่อ', 'เบอร์โทร', 'origin_phone']) as string) || null,
        Map_Link: (getValue(r, ['map_link', 'ลิงก์แผนที่', 'แผนที่', 'map_link_origin']) as string) || null,
        Branch_ID: branchId,
      }
    }).filter(Boolean) as Location[]

    if (prepared.length === 0) return { success: false, message: "ไม่พบข้อมูลที่ถูกต้อง (ต้องมีชื่อสถานที่)" }

    // de-dup by Name+Branch within the batch
    const uniq = new Map<string, Location>()
    prepared.forEach(p => uniq.set(p.Name.trim() + '||' + p.Branch_ID, { ...p, Name: p.Name.trim() }))
    const list = Array.from(uniq.values())

    const { error } = await supabase
      .from('Master_Locations')
      .upsert(list, { onConflict: 'Name,Branch_ID', ignoreDuplicates: false })

    if (error) return { success: false, message: `นำเข้าไม่สำเร็จ: ${error.message}` }
    return { success: true, message: `นำเข้าสำเร็จ ${list.length} สถานที่` }
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : String(e) }
  }
}

// รายชื่อสถานที่ไม่ซ้ำ (สำหรับ autocomplete)
export async function getUniqueLocationNames() {
  try {
    const isAdminUser = await isAdmin()
    const supabase = isAdminUser ? createAdminClient() : await createClient()
    const branchId = await getUserBranchId()
    const isSuper = await isSuperAdmin()

    let q = supabase.from('Master_Locations').select('Name').not('Name', 'is', null)
    if (branchId && branchId !== 'All' && !isSuper) q = q.eq('Branch_ID', branchId)

    const { data } = await q
    const set = new Set<string>()
    ;(data || []).forEach((r: { Name: string | null }) => { if (r.Name) set.add(r.Name.trim()) })
    return Array.from(set).sort()
  } catch {
    return []
  }
}
