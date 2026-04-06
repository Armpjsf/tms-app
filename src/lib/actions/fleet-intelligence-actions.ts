
"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { logActivity } from "@/lib/supabase/logs"

/**
 * FUEL STANDARDS
 */
export async function getFuelStandards() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Fleet_Fuel_Standards')
        .select('*')
        .order('Vehicle_Type')
    
    if (error) return []
    return data
}

export async function saveFuelStandard(standard: any) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Fleet_Fuel_Standards')
        .upsert({
            ...standard,
            Updated_At: new Date().toISOString()
        })
        .select()
        .single()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

/**
 * MAINTENANCE STANDARDS
 */
export async function getMaintenanceStandards() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Fleet_Maintenance_Standards')
        .select('*')
        .order('Component_Name')
    
    if (error) return []
    return data
}

export async function saveMaintenanceStandard(standard: any) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Fleet_Maintenance_Standards')
        .upsert({
            ...standard,
            Updated_At: new Date().toISOString()
        })
        .select()
        .single()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function deleteMaintenanceStandard(name: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('Fleet_Maintenance_Standards')
        .delete()
        .eq('Component_Name', name)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
}

/**
 * ALERTS
 */
export async function getActiveFleetAlerts(vehiclePlate?: string) {
    const supabase = createAdminClient()
    let query = supabase
        .from('Fleet_Intelligence_Alerts')
        .select('*, master_vehicles(brand, model)')
        .eq('Status', 'ACTIVE')
        .order('Created_At', { ascending: false })
    
    if (vehiclePlate) {
        query = query.eq('Vehicle_Plate', vehiclePlate)
    }

    const { data, error } = await query
    if (error) return []
    return data
}

export async function resolveAlert(alertId: string, status: 'RESOLVED' | 'IGNORED' = 'RESOLVED', note?: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Fleet_Intelligence_Alerts')
        .update({
            Status: status,
            Resolved_At: new Date().toISOString(),
            // @ts-ignore
            Resolved_Note: note
        })
        .eq('Alert_ID', alertId)
        .select()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

/**
 * INTELLIGENCE ENGINE: ANALYZE FUEL LOG
 */
export async function analyzeFuelLog(logId: string) {
    console.log(`[FLEET_INTEL] Analyzing Fuel Log: ${logId}`)
    const supabase = createAdminClient()

    try {
        // 1. Get current log
        const { data: log, error: logError } = await supabase
            .from('Fuel_Logs')
            .select('*')
            .eq('Log_ID', logId)
            .single()
        
        if (logError || !log) return { success: false, error: "Log not found" }

        // 2. Get vehicle type and standard
        const { data: vehicle } = await supabase
            .from('master_vehicles')
            .select('vehicle_type')
            .eq('vehicle_plate', log.Vehicle_Plate)
            .single()
        
        if (!vehicle) return { success: false, error: "Vehicle not found" }

        const { data: standard } = await supabase
            .from('Fleet_Fuel_Standards')
            .select('*')
            .eq('Vehicle_Type', vehicle.vehicle_type)
            .maybeSingle()
        
        const targetKmL = standard?.Standard_KM_L || 10.0
        const threshold = standard?.Warning_Threshold_Percent || 15.0

        // 3. Get previous log to calculate KM/L
        const { data: prevLog } = await supabase
            .from('Fuel_Logs')
            .select('Odometer')
            .eq('Vehicle_Plate', log.Vehicle_Plate)
            .lt('Date_Time', log.Date_Time)
            .order('Date_Time', { ascending: false })
            .limit(1)
            .maybeSingle()
        
        if (prevLog && prevLog.Odometer && log.Odometer && log.Liters > 0) {
            const distance = log.Odometer - prevLog.Odometer
            const actualKmL = distance / log.Liters
            const diffPercent = ((targetKmL - actualKmL) / targetKmL) * 100

            // 4. Check for Anomaly (Lower than standard)
            if (diffPercent > threshold) {
                const severity = diffPercent > (threshold * 2) ? 'CRITICAL' : 'WARNING'
                
                await supabase.from('Fleet_Intelligence_Alerts').insert({
                    Vehicle_Plate: log.Vehicle_Plate,
                    Alert_Type: 'FUEL_EFFICIENCY',
                    Severity: severity,
                    Message: `ประสิทธิภาพน้ำมันต่ำกว่าเกณฑ์ (${actualKmL.toFixed(2)} กม./ลิตร)`,
                    Details: {
                        actual: actualKmL,
                        target: targetKmL,
                        diff_percent: diffPercent,
                        distance: distance,
                        liters: log.Liters,
                        log_id: logId
                    }
                })
                console.log(`[FLEET_INTEL] Fuel Alert Created for ${log.Vehicle_Plate}`)
            }
        }

        return { success: true }
    } catch (e: any) {
        console.error("[FLEET_INTEL] Analysis failed:", e.message)
        return { success: false, error: e.message }
    }
}

/**
 * INTELLIGENCE ENGINE: ANALYZE MAINTENANCE
 */
export async function analyzeMaintenanceLog(ticketId: string) {
    console.log(`[FLEET_INTEL] Analyzing Maintenance: ${ticketId}`)
    const supabase = createAdminClient()

    try {
        // 1. Get ticket details
        const { data: ticket } = await supabase
            .from('Repair_Tickets')
            .select('*')
            .eq('Ticket_ID', ticketId)
            .single()
        
        if (!ticket || ticket.Status !== 'Completed') return { success: true } // Only analyze completed repairs

        // 2. Identify component and standard
        // Use Issue_Type to match Component_Name
        const { data: standard } = await supabase
            .from('Fleet_Maintenance_Standards')
            .select('*')
            .ilike('Component_Name', `%${ticket.Issue_Type}%`)
            .maybeSingle()
        
        if (!standard) return { success: true } // No standard defined for this type

        // 3. Find last time this component was serviced for this vehicle
        const { data: prevRepair } = await supabase
            .from('Repair_Tickets')
            .select('Date_Finish, Date_Report') // Assuming we might need odometer if added later
            .eq('Vehicle_Plate', ticket.Vehicle_Plate)
            .eq('Status', 'Completed')
            .eq('Issue_Type', ticket.Issue_Type)
            .lt('Date_Report', ticket.Date_Report)
            .order('Date_Report', { ascending: false })
            .limit(1)
            .maybeSingle()
        
        if (prevRepair && standard.Standard_Months) {
            const lastDate = new Date(prevRepair.Date_Finish || prevRepair.Date_Report)
            const currDate = new Date(ticket.Date_Finish || ticket.Date_Report)
            const monthsDiff = (currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)

            if (monthsDiff < standard.Standard_Months * 0.6) { // Early failure (less than 60% of expected life)
                await supabase.from('Fleet_Intelligence_Alerts').insert({
                    Vehicle_Plate: ticket.Vehicle_Plate,
                    Alert_Type: 'MAINTENANCE_LIFESPAN',
                    Severity: 'WARNING',
                    Message: `เปลี่ยน${ticket.Issue_Type}เร็วกว่ากำหนด (รอบใช้งานเพียง ${monthsDiff.toFixed(1)} เดือน)`,
                    Details: {
                        actual_months: monthsDiff,
                        target_months: standard.Standard_Months,
                        ticket_id: ticketId
                    }
                })
            }
        }

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
