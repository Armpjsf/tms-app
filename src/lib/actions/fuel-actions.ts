"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { logActivity } from "@/lib/supabase/logs"

export type DailyFuelPrice = {
    Date: string
    Fuel_Type: string
    Price: number
    Updated_At?: string
}

const log = (msg: string) => console.log(`[FUEL_SERVICE] ${msg}`)

/**
 * Sync daily fuel prices from Kapook Gas Price website
 */
export async function syncDailyFuelPrices() {
    log('Starting fuel price synchronization...')
    
    try {
        const syncDate = new Date().toISOString().split('T')[0]
        const url = "https://gasprice.kapook.com/gasprice.php"
        log(`Fetching from Kapook: ${url}`)

        // Add a timeout to prevent hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
            throw new Error(`Kapook returned status: ${response.status}`)
        }

        const html = await response.text()
        log(`HTML received (${html.length} chars)`)

        // Improved Scraping: Kapook uses <li> or <tr> with various spacings
        // We look for "ดีเซล" or "diesel" and capture the next decimal number
        // Example: <li>ดีเซล 50.54</li> or <tr><td>ดีเซล</td><td>50.54</td></tr>
        
        const sections = [
            { key: 'ptt', label: 'PTT' },
            { key: 'bcp', label: 'BCP' },
            { key: 'pt', label: 'PT' },
            { key: 'shell', label: 'Shell' }
        ]

        let extractedPrice = 0
        
        for (const station of sections) {
            log(`Trying station: ${station.label} (${station.key})`)
            const sectionRegex = new RegExp(`<a\\s+name="${station.key}"[^>]*>([\\s\\S]*?)(?=<a\\s+name=|$)`, 'i')
            const sectionMatch = html.match(sectionRegex)
            if (!sectionMatch) continue

            const sectionHtml = sectionMatch[1]
            // Pattern: Find "ดีเซล" followed by any characters that are NOT another fuel name, then a price
            // We want to skip "ดีเซลพรีเมียม" - we do this by finding the most specific match
            const priceRegex = /(ดีเซล|diesel|เชลล์ ฟิวเซฟ ดีเซล)[\s\S]*?>\s*([\d,]+\.\d{2})/gi
            let match
            const candidates: { name: string, price: number, isPremium: boolean }[] = []

            while ((match = priceRegex.exec(sectionHtml)) !== null) {
                const fullName = match[1].toLowerCase()
                // Use a larger context to check for premium keywords
                // Get the surrounding text (about 40 chars before)
                const startPos = Math.max(0, match.index - 40)
                const context = sectionHtml.substring(startPos, match.index + 20).toLowerCase()
                
                const isPremium = context.includes('พรีเมียม') || context.includes('premium') || 
                                  context.includes('v-power') || context.includes('ซูเปอร์') ||
                                  context.includes('super')
                
                const price = parseFloat(match[2].replace(/,/g, ''))
                
                if (price > 20) {
                    candidates.push({ name: fullName, price, isPremium })
                }
            }

            // Find first non-premium
            const standard = candidates.find(c => !c.isPremium)
            if (standard) {
                log(`Found standard price at ${station.label}: ${standard.price}`)
                extractedPrice = standard.price
                break
            }
        }

        if (extractedPrice === 0) {
            // Last ditch effort: search the whole HTML for any "ดีเซล" followed by a price that isn't premium
            log('No station-specific price found, trying global search...')
            const globalRegex = /(ดีเซล\s*|diesel\s*)[^\d\s<]*([\d,]+\.\d{2})/gi
            let m;
            while ((m = globalRegex.exec(html)) !== null) {
                const price = parseFloat(m[2].replace(/,/g, ''))
                const isPremium = m[0].includes('พรีเมียม') || m[0].includes('premium')
                if (price > 20 && !isPremium) {
                    extractedPrice = price
                    log(`Found global price match: ${extractedPrice}`)
                    break
                }
            }
        }

        const dieselPrice = extractedPrice

        if (dieselPrice === 0) {
            throw new Error("Could not find any standard diesel price in Kapook HTML")
        }
        
        const supabase = createAdminClient()
        
        log(`Updating DB for ${syncDate} with price ${dieselPrice}...`)
        const { error: upsertError } = await supabase
            .from('daily_fuel_prices')
            .upsert({
                Date: syncDate,
                Fuel_Type: 'Diesel B7',
                Price: dieselPrice,
                Updated_At: new Date().toISOString()
            })

        if (upsertError) {
            console.error('[FUEL_SYNC] DB Error:', upsertError)
            throw upsertError
        }

        await logActivity({
            module: 'Fuel',
            action_type: 'UPDATE',
            target_id: syncDate,
            details: { type: 'Fuel Price', price: dieselPrice, source: 'Kapook Scraper' }
        })

        return { success: true, price: dieselPrice }

    } catch (error: any) {
        log(`Scraping failed: ${error.message}`)
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
        .select('Price')
        .eq('Date', targetDate)
        .maybeSingle()

    if (error) {
        console.error('[FUEL_ACTION] getFuelPrice Error:', error)
    }
    
    if (data?.Price) {
        console.log(`[FUEL_ACTION] Found price in DB for ${targetDate}: ${data.Price}`)
        return data.Price
    }

    console.log(`[FUEL_ACTION] No price in DB for ${targetDate}, triggering sync...`)
    const syncResult = await syncDailyFuelPrices()
    if (syncResult.success) {
        // If the date we wanted was today, return the newly synced price
        const todayStr = new Date().toISOString().split('T')[0]
        if (targetDate === todayStr) {
            return syncResult.price
        }
    }

    // 3. Last Fallback: Get the latest *real* price ever saved in the DB
    const { data: latest, error: lastError } = await supabase
        .from('daily_fuel_prices')
        .select('Price')
        .order('Date', { ascending: false })
        .limit(1)
        .maybeSingle()
    
    if (lastError) console.error('[FUEL_ACTION] getFuelPrice Fallback Error:', lastError)
    return (latest?.Price as number) || null
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
 * Save or update a matrix for [Customer + Route]
 */
export async function saveCustomerMatrix(customerId: string, routeName: string, matrix: any[]) {
    try {
        const supabase = createAdminClient()
        
        // Clean matrix data: ensure no NaN and proper types
        const cleanMatrix = matrix.map(row => ({
            min: Number(row.min) || 0,
            max: Number(row.max) || 0,
            price: Number(row.price) || 0
        }))

        // Verify we have required IDs
        if (!customerId || !routeName) {
            return { success: false, error: "Missing Customer ID or Route Name" }
        }

        const { data, error } = await supabase
            .from('Customer_Route_Rates')
            .upsert({
                Customer_ID: customerId,
                Route_Name: routeName,
                Fuel_Rate_Matrix: cleanMatrix,
                Updated_At: new Date().toISOString()
            }, { 
                onConflict: 'Customer_ID,Route_Name' 
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
