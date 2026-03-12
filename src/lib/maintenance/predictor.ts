import { createClient } from '@/utils/supabase/server'

export type MaintenancePrediction = {
    vehicle_plate: string
    health_score: number // 0-100 (100 is perfect)
    risk_level: 'Low' | 'Medium' | 'High' | 'Critical'
    predicted_issues: string[]
    days_to_service_estimate: number
}

/**
 * AI Predictive Maintenance Engine
 * Analyzes vehicle data to predict potential failures before they happen.
 */
export async function getMaintenancePredictions(branchId?: string): Promise<MaintenancePrediction[]> {
    const supabase = await createClient()

    // 1. Get vehicle data
    let query = supabase
        .from('Vehicles')
        .select('vehicle_plate, current_mileage, next_service_mileage, vehicle_type')
    
    if (branchId && branchId !== 'All') {
        query = query.eq('Branch_ID', branchId)
    }

    const { data: vehicles } = await query
    if (!vehicles) return []

    // 2. Get recent inspection logs to find patterns
    const { data: checks } = await supabase
        .from('Vehicle_Checks')
        .select('Vehicle_Plate, Passed_Items, Check_Date')
        .order('Check_Date', { ascending: false })
        .limit(500)

    const predictions: MaintenancePrediction[] = vehicles.map(v => {
        const issues: string[] = []
        let score = 100

        // Rule 1: Mileage Proximity
        const mileageLeft = (v.next_service_mileage || 0) - (v.current_mileage || 0)
        if (mileageLeft < 500) {
            score -= 40
            issues.push('ถึงกำหนดเช็คระยะใหญ่ (Overdue/Urgent)')
        } else if (mileageLeft < 2000) {
            score -= 15
            issues.push('ใกล้กำหนดเช็คระยะ (ภายใน 2,000 กม.)')
        }

        // Rule 2: Inspection History Analysis
        const vehicleChecks = checks?.filter(c => c.Vehicle_Plate === v.vehicle_plate) || []
        const recentFailedItems = new Set<string>()
        
        vehicleChecks.slice(0, 3).forEach(check => {
            const passed = check.Passed_Items as Record<string, boolean>
            Object.entries(passed).forEach(([item, isPassed]) => {
                if (!isPassed) recentFailedItems.add(item)
            })
        })

        if (recentFailedItems.size > 0) {
            score -= (recentFailedItems.size * 10)
            issues.push(`พบความผิดปกติซ้ำในหมวด: ${Array.from(recentFailedItems).join(', ')}`)
        }

        // Rule 3: Heavy Usage Degradation
        if ((v.current_mileage || 0) > 300000) {
            score -= 10
            issues.push('รถใช้งานหนัก (High Mileage Degradation)')
        }

        // Finalize Risk Level
        let risk: MaintenancePrediction['risk_level'] = 'Low'
        if (score < 40) risk = 'Critical'
        else if (score < 65) risk = 'High'
        else if (score < 85) risk = 'Medium'

        return {
            vehicle_plate: v.vehicle_plate,
            health_score: Math.max(0, score),
            risk_level: risk,
            predicted_issues: issues,
            days_to_service_estimate: Math.max(0, Math.floor(mileageLeft / 200)) // Assumes 200km/day avg
        }
    })

    return predictions.sort((a, b) => a.health_score - b.health_score)
}
