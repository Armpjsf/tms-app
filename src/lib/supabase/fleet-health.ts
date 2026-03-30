"use server"

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getUserBranchId, isSuperAdmin } from "@/lib/permissions"

export type HealthAlert = {
    vehicle_plate: string
    driver_id: string | null
    driver_name?: string
    issue_type: 'compliance' | 'maintenance' | 'service'
    description: string
    priority: 'high' | 'medium' | 'low'
    expiry_date?: string
    remaining_km?: number
}

export async function getFleetHealthAlerts(): Promise<HealthAlert[]> {
    try {
        const isAdmin = await isSuperAdmin()
        const supabase = isAdmin ? await createAdminClient() : await createClient()
        const branchId = await getUserBranchId()

        // 1. Fetch all active vehicles for the branch
        let vehicleQuery = supabase
            .from('Master_Vehicles')
            .select(`
                Vehicle_Plate, 
                Driver_ID,
                Insurance_Expiry, 
                Tax_Expiry, 
                Act_Expiry, 
                Current_Mileage, 
                Next_Service_Mileage,
                Active_Status,
                Branch_ID
            `)
            .eq('Active_Status', 'Active')

        if (branchId && branchId !== 'All') {
            vehicleQuery = vehicleQuery.eq('Branch_ID', branchId)
        } else if (!isAdmin && !branchId) {
            return []
        }

        const { data: vehicles, error: vError } = await vehicleQuery
        if (vError || !vehicles) return []

        // 2. Fetch driver names for mapping
        const { data: drivers } = await supabase
            .from('Master_Drivers')
            .select('Driver_ID, Driver_Name')
        
        const driverMap = new Map(drivers?.map(d => [d.Driver_ID, d.Driver_Name]) || [])

        // 3. Fetch active repair tickets
        let repairQuery = supabase
            .from('Repair_Tickets')
            .select('Vehicle_Plate, Issue_Type, Priority, Status')
            .in('Status', ['Pending', 'In Progress', 'รอดำเนินการ', 'กำลังซ่อม'])

        if (branchId && branchId !== 'All') {
            repairQuery = repairQuery.eq('Branch_ID', branchId)
        }

        const { data: repairs } = await repairQuery

        const alerts: HealthAlert[] = []
        const now = new Date()
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        vehicles.forEach(v => {
            const driverName = v.Driver_ID ? driverMap.get(v.Driver_ID) : undefined

            // Compliance Checks
            const checks = [
                { type: 'Insurance', date: v.Insurance_Expiry },
                { type: 'Tax', date: v.Tax_Expiry },
                { type: 'ACT', date: v.Act_Expiry }
            ]

            checks.forEach(check => {
                if (check.date) {
                    const expiry = new Date(check.date)
                    if (expiry < now) {
                        alerts.push({
                            vehicle_plate: v.Vehicle_Plate,
                            driver_id: v.Driver_ID,
                            driver_name: driverName,
                            issue_type: 'compliance',
                            description: `${check.type} Expired`,
                            priority: 'high',
                            expiry_date: check.date
                        })
                    } else if (expiry < thirtyDaysAhead) {
                        alerts.push({
                            vehicle_plate: v.Vehicle_Plate,
                            driver_id: v.Driver_ID,
                            driver_name: driverName,
                            issue_type: 'compliance',
                            description: `${check.type} Expiring Soon`,
                            priority: 'medium',
                            expiry_date: check.date
                        })
                    }
                }
            })

            // Service Checks (Mileage)
            if (v.Current_Mileage && v.Next_Service_Mileage) {
                const diff = v.Next_Service_Mileage - v.Current_Mileage
                if (diff <= 0) {
                    alerts.push({
                        vehicle_plate: v.Vehicle_Plate,
                        driver_id: v.Driver_ID,
                        driver_name: driverName,
                        issue_type: 'service',
                        description: 'Overdue for Service',
                        priority: 'high',
                        remaining_km: diff
                    })
                } else if (diff <= 1000) {
                    alerts.push({
                        vehicle_plate: v.Vehicle_Plate,
                        driver_id: v.Driver_ID,
                        driver_name: driverName,
                        issue_type: 'service',
                        description: 'Service Due Soon',
                        priority: 'medium',
                        remaining_km: diff
                    })
                }
            }

            // Maintenance Checks (Active Tickets)
            const vehicleRepairs = repairs?.filter(r => r.Vehicle_Plate === v.Vehicle_Plate) || []
            vehicleRepairs.forEach(r => {
                alerts.push({
                    vehicle_plate: v.Vehicle_Plate,
                    driver_id: v.Driver_ID,
                    driver_name: driverName,
                    issue_type: 'maintenance',
                    description: r.Issue_Type || 'Maintenance Required',
                    priority: r.Priority?.toLowerCase() === 'high' ? 'high' : 'medium'
                })
            })
        })

        return alerts.sort((a, b) => {
            const priorityMap = { high: 0, medium: 1, low: 2 }
            return priorityMap[a.priority] - priorityMap[b.priority]
        })

    } catch {
        return []
    }
}
