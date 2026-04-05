
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
        console.log('[FUEL_SYNC] Received API data:', JSON.stringify(data).substring(0, 200) + '...')
        
        // Handle multiple response structures (Standard or Nested)
        const stations = data.response?.stations || data.stations || data.response || data
        if (!stations || (typeof stations !== 'object')) {
            console.error('[FUEL_SYNC] Invalid stations data format:', data)
            throw new Error("Invalid API response structure")
        }

        // Search for PTT brand in various possible keys
        const ptt = stations.ptt || stations['PTT'] || stations['ปตท.'] || stations.ปตท
        if (!ptt) {
            console.error('[FUEL_SYNC] PTT brand not found in stations:', Object.keys(stations))
            throw new Error("PTT brand data missing from API")
        }
        
        // Extraction Logic for Diesel Price
        const getPriceValue = (item: any) => {
            if (!item) return null
            if (typeof item === 'string' || typeof item === 'number') return parseFloat(item.toString())
            if (item.price) return parseFloat(item.price.toString())
            return null
        }

        // Priority: Diesel B7 -> Diesel -> First Diesel-like product
        let dieselPrice = getPriceValue(ptt.diesel_b7 || ptt['ดีเซล B7'] || ptt['ดีเซล หมุนเร็ว B7'])
        if (!dieselPrice) dieselPrice = getPriceValue(ptt.diesel || ptt['ดีเซล'])
        
        // Ultimate fallback: Search keys for 'Diesel' or 'ดีเซล'
        if (!dieselPrice) {
            const dieselKey = Object.keys(ptt).find(k => k.toLowerCase().includes('diesel') || k.includes('ดีเซล'))
            if (dieselKey) dieselPrice = getPriceValue(ptt[dieselKey])
        }

        if (!dieselPrice || isNaN(dieselPrice)) {
            console.error('[FUEL_SYNC] Failed to extract a valid diesel price from:', ptt)
            throw new Error("Valid diesel price not found in PTT data")
        }

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
        
        // If still nothing, trigger a sync
        if (!latest) {
            const syncResult = await syncDailyFuelPrices()
            if (syncResult.success) return syncResult.price
        }
        
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
