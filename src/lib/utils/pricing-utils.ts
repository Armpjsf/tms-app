/**
 * Smart Pricing Engine - TMS 2026
 * Calculates transportation costs based on distance, vehicle type, and market factors.
 */

export type PricingFactor = {
    distanceKm: number
    vehicleType: string
    urgency: 'Standard' | 'Express' | 'SameDay'
    hasHelper: boolean
    isRemoteArea: boolean
    currentFuelPrice?: number // Optional: Price of Diesel/Gasoline today
}

export type PriceBreakdown = {
    baseFare: number
    distanceCharge: number
    fuelSurcharge: number
    extraServices: number
    totalPrice: number
    estimatedMargin: number
}

// Pricing Configuration per Vehicle Type
const PRICING_CONFIG: Record<string, { base: number, perKm: number, fuelBase: number }> = {
    '4-Wheel': { base: 300, perKm: 12, fuelBase: 30 },
    '6-Wheel': { base: 800, perKm: 18, fuelBase: 30 },
    '10-Wheel': { base: 1500, perKm: 28, fuelBase: 30 },
    'Motorcycle': { base: 50, perKm: 5, fuelBase: 35 },
    'default': { base: 500, perKm: 15, fuelBase: 30 }
}

/**
 * Main Pricing Function
 */
export function calculateTransportationPrice(factors: PricingFactor): PriceBreakdown {
    const config = PRICING_CONFIG[factors.vehicleType] || PRICING_CONFIG['default']
    
    // 1. Base Fare
    const baseFare = config.base

    // 2. Distance Charge (Tiered)
    let distanceCharge = 0
    if (factors.distanceKm <= 50) {
        distanceCharge = factors.distanceKm * config.perKm
    } else if (factors.distanceKm <= 200) {
        distanceCharge = (50 * config.perKm) + ((factors.distanceKm - 50) * (config.perKm * 0.9)) // 10% discount for longer trips
    } else {
        distanceCharge = (50 * config.perKm) + (150 * (config.perKm * 0.9)) + ((factors.distanceKm - 200) * (config.perKm * 0.85)) // 20% discount
    }

    // 3. Fuel Surcharge (Adjusts if current fuel > base fuel)
    let fuelSurcharge = 0
    if (factors.currentFuelPrice && factors.currentFuelPrice > config.fuelBase) {
        const fuelDiff = factors.currentFuelPrice - config.fuelBase
        fuelSurcharge = (factors.distanceKm / 10) * fuelDiff // Simple surcharge logic
    }

    // 4. Extra Services
    let extraServices = 0
    if (factors.hasHelper) extraServices += 300
    if (factors.isRemoteArea) extraServices += 500
    
    // Urgency Multiplier
    let multiplier = 1.0
    if (factors.urgency === 'Express') multiplier = 1.2
    if (factors.urgency === 'SameDay') multiplier = 1.5

    const subTotal = baseFare + distanceCharge + fuelSurcharge + extraServices
    const totalPrice = Math.round(subTotal * multiplier)

    return {
        baseFare,
        distanceCharge: Math.round(distanceCharge),
        fuelSurcharge: Math.round(fuelSurcharge),
        extraServices,
        totalPrice,
        estimatedMargin: Math.round(totalPrice * 0.25) // Estimate 25% profit margin
    }
}
