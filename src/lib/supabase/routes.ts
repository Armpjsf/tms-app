"use server"

import { createClient } from '@/utils/supabase/server'
import { getUserBranchId, getUserRole } from "@/lib/permissions"

export type Route = {
  Route_Name: string
  Origin: string | null
  Map_Link_Origin: string | null
  Destination: string | null
  Map_Link_Destination: string | null
  Distance_KM: number | null
  Branch_ID: string | null
  Created_At?: string
}

export type Branch = {
  Branch_ID: string
  Branch_Name: string
}

export async function getCurrentUserRole() {
  return await getUserRole()
}

// Get all routes
export async function getAllRoutes(page?: number, limit?: number, query?: string, branchId?: string) {
  try {
    const supabase = await createClient()
    let queryBuilder = supabase.from('Master_Routes').select('*', { count: 'exact' })
    
    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }
    
    if (query) {
      queryBuilder = queryBuilder.or(`Route_Name.ilike.%${query}%,Origin.ilike.%${query}%,Destination.ilike.%${query}%`)
    }

    if (branchId && branchId !== 'All') {
        queryBuilder = queryBuilder.eq('Branch_ID', branchId)
    }
    
    const { data, error, count } = await queryBuilder.order('Route_Name', { ascending: true })
    
    if (error) {
      console.error('Error fetching routes:', error)
      return { data: [], count: 0 }
    }
    
    return { data: data || [], count: count || 0 }
  } catch (e) {
    console.error(e)
    return { data: [], count: 0 }
  }
}

// Get all branches
export async function getBranches() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('Master_Branches').select('Branch_ID, Branch_Name').order('Branch_Name')
    
    if (error) {
       console.error('Error fetching branches:', error)
       return []
    }
    return data || []
  } catch (e) {
    console.error(e)
    return []
  }
}

// Create route
export async function createRoute(routeData: Partial<Route>) {
  try {
    const supabase = await createClient()
    
    // Route_Name is PK, must be provided
    if (!routeData.Route_Name) {
        return { success: false, error: "Route Name is required" }
    }

    const { data, error } = await supabase
      .from('Master_Routes')
      .insert({
        Route_Name: routeData.Route_Name,
        Origin: routeData.Origin,
        Map_Link_Origin: routeData.Map_Link_Origin,
        Destination: routeData.Destination,
        Map_Link_Destination: routeData.Map_Link_Destination,
        Distance_KM: routeData.Distance_KM,
        Branch_ID: routeData.Branch_ID
      })
      .select()
      .single()
    
    if (error) {
        console.error('Error creating route:', error)
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Update route
export async function updateRoute(originalRouteName: string, routeData: Partial<Route>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('Master_Routes')
      .update({
        Route_Name: routeData.Route_Name,
        Origin: routeData.Origin,
        Map_Link_Origin: routeData.Map_Link_Origin,
        Destination: routeData.Destination,
        Map_Link_Destination: routeData.Map_Link_Destination,
        Distance_KM: routeData.Distance_KM,
        Branch_ID: routeData.Branch_ID
      })
      .eq('Route_Name', originalRouteName)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Delete route
export async function deleteRoute(routeName: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('Master_Routes')
      .delete()
      .eq('Route_Name', routeName)
    
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Bulk create routes
export async function createBulkRoutes(routes: any[]) {
    try {
        const supabase = await createClient()
        const currentUserBranch = await getUserBranchId()
        
        // Fetch All Branches to map Name -> ID
        const { data: branches } = await supabase.from('Master_Branches').select('Branch_ID, Branch_Name')
        const branchMap = new Map<string, string>()
        if (branches) {
            branches.forEach(b => {
                branchMap.set(b.Branch_Name.trim(), b.Branch_ID)
                branchMap.set(b.Branch_ID, b.Branch_ID)
            })
        }

        // Normalize keys
        const normalizeData = (row: any) => {
            const normalized: any = {}
            const getValue = (keys: string[]) => {
                const rowKeys = Object.keys(row)
                for (const key of keys) {
                    const foundKey = rowKeys.find(k => k.toLowerCase().replace(/\\s+/g, '') === key.toLowerCase().replace(/\\s+/g, ''))
                    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                        return row[foundKey]
                    }
                }
                return undefined
            }
    
            normalized.Route_Name = getValue(['route_name', 'name', 'route', 'ชื่อเส้นทาง', 'เส้นทาง'])
            normalized.Origin = getValue(['origin', 'source', 'start', 'ต้นทาง', 'จุดเริ่มต้น'])
            normalized.Destination = getValue(['destination', 'dest', 'end', 'ปลายทาง', 'จุดสิ้นสุด'])
            // Map Links & Distance
            normalized.Map_Link_Origin = getValue(['map_link_origin', 'origin_link', 'link_start', 'ลิ้งค์ต้นทาง'])
            normalized.Map_Link_Destination = getValue(['map_link_destination', 'destination_link', 'link_end', 'ลิ้งค์ปลายทาง'])
            normalized.Distance_KM = getValue(['distance', 'km', 'distance_km', 'ระยะทาง'])
            
            normalized.Branch_ID = getValue(['branch_id', 'branch', 'สาขา'])
            
            return normalized
        }
    
        const cleanData = routes.map(r => normalizeData(r)).filter(r => r.Route_Name)
    
        if (cleanData.length === 0) {
            return { success: false, message: "ไม่พบข้อมูลที่ถูกต้อง (ต้องมีชื่อเส้นทาง)" }
        }

        // Prepare data with Branch ID resolved
        const preparedRoutes = cleanData.map(r => {
             // Resolve Branch ID
             let branchId = currentUserBranch || 'HQ'
             if (r.Branch_ID) {
                 const key = String(r.Branch_ID).trim()
                 if (branchMap.has(key)) {
                     branchId = branchMap.get(key) || 'HQ'
                 } else {
                     const found = branches?.find(b => {
                         const bName = String(b.Branch_Name || '')
                         return bName && (bName.includes(key) || key.includes(bName))
                     })
                     if (found) {
                         branchId = found.Branch_ID
                     }
                 }
             }

             return {
                Route_Name: r.Route_Name,
                Origin: r.Origin,
                Map_Link_Origin: r.Map_Link_Origin,
                Destination: r.Destination,
                Map_Link_Destination: r.Map_Link_Destination,
                Distance_KM: r.Distance_KM ? parseFloat(r.Distance_KM) : null,
                Branch_ID: branchId
             }
        })

        // Check for existing routes
        const namesToCheck = preparedRoutes.map(r => r.Route_Name)
        
        const { data: existingRoutes } = await supabase
            .from('Master_Routes')
            .select('Route_Name')
            .in('Route_Name', namesToCheck)

        const existingNames = new Set(existingRoutes?.map(r => r.Route_Name) || [])
        
        const toInsert: any[] = []
        const toUpdate: any[] = []

        preparedRoutes.forEach(r => {
            if (existingNames.has(r.Route_Name)) {
                toUpdate.push(r)
            } else {
                toInsert.push(r)
            }
        })

        // 1. Perform Inserts
        if (toInsert.length > 0) {
            const { error } = await supabase.from('Master_Routes').insert(toInsert)
            if (error) {
                console.error("Bulk create routes error (insert):", error)
                return { success: false, message: `Failed to import new routes: ${error.message}` }
            }
        }

        // 2. Perform Updates
        if (toUpdate.length > 0) {
            await Promise.all(toUpdate.map(async (r) => {
                await supabase.from('Master_Routes')
                    .update({
                        Origin: r.Origin,
                        Map_Link_Origin: r.Map_Link_Origin,
                        Destination: r.Destination,
                        Map_Link_Destination: r.Map_Link_Destination,
                        Distance_KM: r.Distance_KM,
                        Branch_ID: r.Branch_ID
                    })
                    .eq('Route_Name', r.Route_Name)
            }))
        }
    
        return { 
            success: true, 
            message: `นำเข้าสำเร็จ: เพิ่มใหม่ ${toInsert.length} รายการ, อัปเดต ${toUpdate.length} รายการ`
        }

    } catch (e: any) {
        return { success: false, message: e.message }
    }
}

// Get all unique locations (Origin + Destination) for autocomplete
export async function getUniqueLocations() {
  try {
    const supabase = await createClient()
    
    // Fetch unique Origins
    const { data: origins } = await supabase
      .from('Master_Routes')
      .select('Origin')
      .not('Origin', 'is', null)
      
    // Fetch unique Destinations
    const { data: destinations } = await supabase
      .from('Master_Routes')
      .select('Destination')
      .not('Destination', 'is', null)

    const locationSet = new Set<string>()
    
    if (origins) {
        origins.forEach(o => {
            if (o.Origin) locationSet.add(o.Origin.trim())
        })
    }
    
    if (destinations) {
        destinations.forEach(d => {
            if (d.Destination) locationSet.add(d.Destination.trim())
        })
    }
    
    return Array.from(locationSet).sort()
  } catch (e) {
    console.error("Error fetching locations:", e)
    return []
  }
}
