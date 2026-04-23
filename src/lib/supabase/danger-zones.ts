"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { getUserBranchId } from "@/lib/permissions"

export type DangerZone = {
    Zone_ID?: string;
    Zone_Name: string;
    Coordinates: [number, number][]; // Polygon points
    Is_Active: boolean;
    Email_Recipient?: string;
    Branch_ID: string;
    Created_At?: string;
}

export async function getDangerZones(branchId?: string) {
    const supabase = await createAdminClient()
    const sessionBranchId = await getUserBranchId()
    const targetBranchId = branchId || sessionBranchId

    let query = supabase.from('Master_Danger_Zones').select('*')
    if (targetBranchId && targetBranchId !== 'All') {
        query = query.eq('Branch_ID', targetBranchId)
    }

    const { data } = await query.order('Created_At', { ascending: false })
    return data || []
}

export async function upsertDangerZone(zone: Partial<DangerZone>) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('Master_Danger_Zones')
        .upsert(zone)
        .select()
        .single()
    
    if (error) throw error
    return data
}

export async function deleteDangerZone(zoneId: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('Master_Danger_Zones')
        .delete()
        .eq('Zone_ID', zoneId)
    
    if (error) throw error
    return true
}

// Point in Polygon Algorithm (Ray Casting)
export function isPointInPolygon(point: [number, number], polygon: [number, number][]) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
