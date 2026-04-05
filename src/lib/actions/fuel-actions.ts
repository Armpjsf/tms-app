
"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { logActivity } from "@/lib/supabase/logs"

const FUEL_API_URL = 'https://thai-oil-api.vercel.app/latest'

export type DailyFuelPrice = {
    Date: string
    Fuel_Type: string
    Price: number
    Updated_At?: string
}

/**
 * Sync daily fuel prices from public API to Supabase
 * Target: Diesel B7 (PTT)
 */
export async function syncDailyFuelPrices() {
    console.log('[FUEL_SYNC] Starting sync process...')
    
    try {
        const response = await fetch(FUEL_API_URL, { next: { revalidate: 3600 } })
        if (!response.ok) throw new Error(`API Error: ${response.status}`)
        
        const data = await response.json()
        const oilData = data.response
        const ptt = oilData['PTT'] || oilData['ปตท.']
        
        if (!ptt) throw new Error("PTT data not found in API response")
        
        // Target: Diesel B7
        const price = ptt['Diesel B7'] || ptt['ดีเซล B7'] || ptt['Diesel']
        if (!price) throw new Error("Diesel B7 price not found")

        const dieselPrice = parseFloat(price)
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        const supabase = createAdminClient()
        
        const { error } = await supabase
            .from('Daily_Fuel_Prices')
            .upsert({
                Date: today,
                Fuel_Type: 'Diesel B7',
                Price: dieselPrice,
                Updated_At: new Date().toISOString()
            })

        if (error) throw error

        console.log(`[FUEL_SYNC] Successfully updated price for ${today}: ${dieselPrice} THB`)
        
        await logActivity({
            module: 'System',
            action_type: 'SYNC',
            target_id: today,
            details: {
                type: 'Fuel Price',
                price: dieselPrice,
                brand: 'PTT',
                product: 'Diesel B7'
            }
        })

        return { success: true, price: dieselPrice }

    } catch (error: any) {
        console.error('[FUEL_SYNC] Sync failed:', error.message)
        return { success: false, error: error.message }
    }
}

/**
 * Get fuel price for a specific date
 */
export async function getFuelPrice(date?: string) {
    const supabase = createAdminClient()
    const targetDate = date || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('Daily_Fuel_Prices')
        .select('Price')
        .eq('Date', targetDate)
        .maybeSingle()

    if (error || !data) {
        // Fallback to the latest available price if specific date not found
        const { data: latest } = await supabase
            .from('Daily_Fuel_Prices')
            .select('Price, Date')
            .order('Date', { ascending: false })
            .limit(1)
            .maybeSingle()
        
        return latest?.Price || 0
    }

    return data.Price
}

/**
 * Match a fuel price against a route's matrix to get suggested rate
 */
export async function getSuggestedRate(customerId: string, routeName: string, fuelPrice: number) {
    if (!customerId || !routeName || !fuelPrice) return null

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Customer_Route_Rates')
        .select('Fuel_Rate_Matrix')
        .eq('Customer_ID', customerId)
        .eq('Route_Name', routeName)
        .maybeSingle()

    if (error || !data || !data.Fuel_Rate_Matrix) return null

    const matrix = data.Fuel_Rate_Matrix as Array<{ min: number, max: number, price: number }>
    
    // Find the range that includes the current fuel price
    const match = matrix.find(range => fuelPrice >= range.min && fuelPrice <= range.max)
    
    return match ? match.price : null
}

/**
 * Get all matrices for a customer
 */
export async function getCustomerMatrices(customerId: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Customer_Route_Rates')
        .select('*')
        .eq('Customer_ID', customerId)
    
    if (error) return []
    return data
}

/**
 * Save or update a matrix for [Customer + Route]
 */
export async function saveCustomerMatrix(customerId: string, routeName: string, matrix: any[]) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Customer_Route_Rates')
        .upsert({
            Customer_ID: customerId,
            Route_Name: routeName,
            Fuel_Rate_Matrix: matrix,
            Updated_At: new Date().toISOString()
        })
        .select()
        .single()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

/**
 * Delete a matrix
 */
export async function deleteCustomerMatrix(id: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('Customer_Route_Rates')
        .delete()
        .eq('ID', id)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
}

