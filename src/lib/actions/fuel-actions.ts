"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { logActivity } from "@/lib/supabase/logs"

export type DailyFuelPrice = {
    Date: string
    Fuel_Type: string
    Price: number
    Price_Tomorrow?: number
    Updated_At?: string
}

const log = (msg: string) => console.log(`[FUEL_SERVICE] ${msg}`)

/**
 * Sync daily fuel prices from Kapook Gas Price website
 */
export async function syncDailyFuelPrices() {
    log('Starting fuel price synchronization (Bangchak API)...')
    
    try {
        const syncDate = new Date().toISOString().split('T')[0]
        const url = "https://oil-price.bangchak.co.th/ApiOilPrice2/th"
        log(`Fetching from Bangchak API: ${url}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(url, {
            headers: { 
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': 'https://www.bangchak.co.th/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            },
            signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
            throw new Error(`Bangchak API returned status: ${response.status}`)
        }

        const data = await response.json()
        log(`Bangchak Data Received: ${JSON.stringify(data).substring(0, 200)}...`)
        
        // Bangchak Response contains 'OilList'
        const oilList = data.OilList || []
        
        if (oilList.length === 0) {
            log('WARNING: Bangchak API returned an EMPTY OilList.')
            throw new Error("Empty oil list from Bangchak API")
        }

        // LOG ALL OILS FOR DEBUGGING
        log('--- START OIL LIST ---')
        oilList.forEach((o: any) => log(`- ${o.OilName}: Today=${o.PriceToday}, Tomorrow=${o.PriceTomorrow}`))
        log('--- END OIL LIST ---')

        // We look for 'ไฮดีเซล S' which is the standard diesel (expected 48.40)
        // We prioritize exact matches to avoid picking up subsidized/wrong types
        const standardDiesel = oilList.find((oil: any) => oil.OilName === 'ไฮดีเซล S') 
            || oilList.find((oil: any) => oil.OilName.includes('ดีเซล') && !oil.OilName.includes('พรีเมียม') && !oil.OilName.includes('B20'))

        if (!standardDiesel) {
            log('Standard Diesel not found in Bangchak API response.')
            throw new Error("Could not find standard diesel price in Bangchak API")
        }

        const dieselPrice = parseFloat(standardDiesel.PriceToday)
        const dieselPriceTomorrow = parseFloat(standardDiesel.PriceTomorrow)
        
        log(`Extracted from Bangchak: Today=${dieselPrice}, Tomorrow=${dieselPriceTomorrow}`)

        if (isNaN(dieselPrice) || dieselPrice === 0) {
            throw new Error("Invalid diesel price received from Bangchak")
        }
        
        const supabase = createAdminClient()
        
        log(`Updating DB for ${syncDate} with Today: ${dieselPrice}, Tomorrow: ${dieselPriceTomorrow}...`)
        
        // We use upsert on (Date, Fuel_Type) if unique constraint exists, 
        // else we just update the record for today.
        const { error: upsertError } = await supabase
            .from('daily_fuel_prices')
            .upsert({
                Date: syncDate,
                Fuel_Type: 'Diesel B7',
                Price: dieselPrice,
                Price_Tomorrow: dieselPriceTomorrow,
                Updated_At: new Date().toISOString()
            }, { onConflict: 'Date' })

        if (upsertError) {
            console.error('[FUEL_SYNC] DB Error:', upsertError)
            // If the column Price_Tomorrow doesn't exist yet, we try without it to avoid crashing the whole system
            if (upsertError.message.includes('Price_Tomorrow')) {
                log('Price_Tomorrow column missing, falling back to standard Price update...')
                await supabase
                    .from('daily_fuel_prices')
                    .upsert({
                        Date: syncDate,
                        Fuel_Type: 'Diesel B7',
                        Price: dieselPrice,
                        Updated_At: new Date().toISOString()
                    }, { onConflict: 'Date' })
            } else {
                throw upsertError
            }
        }

        await logActivity({
            module: 'Fuel',
            action_type: 'UPDATE',
            target_id: syncDate,
            details: { 
                type: 'Fuel Price', 
                price: dieselPrice, 
                priceTomorrow: dieselPriceTomorrow,
                source: 'Bangchak API' 
            }
        })

        return { 
            success: true, 
            price: dieselPrice, 
            priceTomorrow: dieselPriceTomorrow 
        }

    } catch (error: any) {
        log(`Sync failed: ${error.message}`)
        return { success: false, error: error.message }
    }
}

/**
 * Get fuel price for a specific date
 * Returns null if no price is available
 */
export async function getFuelPrice(date?: string) {
    const supabase = createAdminClient()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // 1. Try DB first for the exact date
    const { data, error } = await supabase
        .from('daily_fuel_prices')
        .select('Price, Price_Tomorrow')
        .eq('Date', targetDate)
        .maybeSingle()

    if (error) {
        console.error('[FUEL_ACTION] getFuelPrice Error:', error)
    }
    
    if (data?.Price) {
        console.log(`[FUEL_ACTION] Found price in DB for ${targetDate}: ${data.Price}`)
        return { 
            price: data.Price, 
            priceTomorrow: data.Price_Tomorrow || null 
        }
    }

    console.log(`[FUEL_ACTION] No price in DB for ${targetDate}, triggering sync...`)
    const syncResult = await syncDailyFuelPrices()
    if (syncResult.success) {
        // If the date we wanted was today, return the newly synced prices
        const todayStr = new Date().toISOString().split('T')[0]
        if (targetDate === todayStr) {
            return { 
                price: syncResult.price, 
                priceTomorrow: syncResult.priceTomorrow || null 
            }
        }
    }

    // 3. Last Fallback: Get the latest *real* price ever saved in the DB
    const { data: latest, error: lastError } = await supabase
        .from('daily_fuel_prices')
        .select('Price, Price_Tomorrow')
        .order('Date', { ascending: false })
        .limit(1)
        .maybeSingle()
    
    if (lastError) console.error('[FUEL_ACTION] getFuelPrice Fallback Error:', lastError)
    
    return {
        price: (latest?.Price as number) || null, // NO FALLBACK to fake values. If null, UI shows 0/Error.
        priceTomorrow: (latest?.Price_Tomorrow as number) || null
    }
}

/**
 * Compatibility wrapper to return just the price number for existing callers
 */
export async function getFuelPriceNumber(date?: string): Promise<number | null> {
    const res = await getFuelPrice(date)
    return res.price
}

/**
 * Match a fuel price against a route's matrix to get suggested rate
 */
export async function getSuggestedRate(customerId: string, routeName: string, fuelPrice: number, vehicleType: string = '4-Wheel') {
    if (!customerId || !routeName || !fuelPrice) return null

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('Customer_Route_Rates')
        .select('Fuel_Rate_Matrix')
        .eq('Customer_ID', customerId)
        .eq('Route_Name', routeName)
        .ilike('Vehicle_Type', vehicleType) // Use ilike for case-insensitivity
        .maybeSingle()

    if (error) {
        console.error('[FUEL_ACTION] getSuggestedRate Error:', error)
        return null
    }
    if (!data || !data.Fuel_Rate_Matrix) return null

    const matrix = data.Fuel_Rate_Matrix as Array<{ min: number, max: number, price: number }>
    if (!matrix || matrix.length === 0) return null

    // Sort to ensure we can identify min/max bounds
    const sortedMatrix = [...matrix].sort((a, b) => a.min - b.min)
    
    // 1. Check for exact match
    const match = sortedMatrix.find(range => fuelPrice >= range.min && fuelPrice <= range.max)
    if (match) return match.price

    // 2. Clamping Logic:
    // If price is higher than the highest range's max, use the highest range's price
    const highest = sortedMatrix[sortedMatrix.length - 1]
    if (fuelPrice > highest.max) {
        console.log(`[FUEL_ACTION] Price ${fuelPrice} exceeds max range ${highest.max}. Clamping to: ${highest.price}`)
        return highest.price
    }

    // If price is lower than the lowest range's min, use the lowest range's price
    const lowest = sortedMatrix[0]
    if (fuelPrice < lowest.min) {
        console.log(`[FUEL_ACTION] Price ${fuelPrice} is below min range ${lowest.min}. Clamping to: ${lowest.price}`)
        return lowest.price
    }
    
    return null
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
    
    if (error) {
        console.error('[FUEL_ACTION] getCustomerMatrices Error:', error)
        return []
    }
    return data
}

/**
 * Save or update a matrix for [Customer + Route + Vehicle_Type]
 */
export async function saveCustomerMatrix(customerId: string, routeName: string, vehicleType: string, matrix: any[]) {
    try {
        const supabase = createAdminClient()
        
        // Clean matrix data: ensure no NaN and proper types
        const cleanMatrix = matrix.map(row => ({
            min: Number(row.min) || 0,
            max: Number(row.max) || 0,
            price: Number(row.price) || 0
        }))

        // Verify we have required IDs
        if (!customerId || !routeName || !vehicleType) {
            return { success: false, error: "Missing Customer ID, Route Name, or Vehicle Type" }
        }

        const { data, error } = await supabase
            .from('Customer_Route_Rates')
            .upsert({
                Customer_ID: customerId,
                Route_Name: routeName,
                Vehicle_Type: vehicleType,
                Fuel_Rate_Matrix: cleanMatrix,
                Updated_At: new Date().toISOString()
            }, { 
                onConflict: 'Customer_ID,Route_Name,Vehicle_Type' 
            })
            .select()
            .single()
        
        if (error) {
            console.error('[FUEL_ACTION] Save failed:', error)
            return { success: false, error: error.message }
        }
        return { success: true, data }
    } catch (e: any) {
        console.error('[FUEL_ACTION] Exception:', e)
        return { success: false, error: e.message }
    }
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
