/**
 * Enterprise ESG (Environmental, Social, and Governance) Utilities
 * Calculates the environmental impact of logistics optimization.
 */

export type ESGImpact = {
    co2SavedKg: number
    treesEquivalent: number
    fuelSavedLiters: number
    carbonScore: number // 0-100
}

export const CO2_COEFFICIENTS: Record<string, number> = {
    '4-Wheel': 0.17,
    '6-Wheel': 0.25,
    '10-Wheel': 0.45,
    'Motorcycle': 0.08,
    'default': 0.20
}

export const FUEL_EFFICIENCY: Record<string, number> = {
    '4-Wheel': 12, // KM/L
    '6-Wheel': 8,
    '10-Wheel': 4,
    'Motorcycle': 40,
    'default': 10
}

export function calculateESGImpact(savedKm: number, vehicleType = 'default'): ESGImpact {
    const co2Rate = CO2_COEFFICIENTS[vehicleType] || CO2_COEFFICIENTS['default']
    const fuelRate = FUEL_EFFICIENCY[vehicleType] || FUEL_EFFICIENCY['default']

    const co2SavedKg = savedKm * co2Rate
    const fuelSavedLiters = savedKm / fuelRate
    
    // 1 Tree absorbs approx 22kg of CO2 per year
    const treesEquivalent = co2SavedKg / 22

    return {
        co2SavedKg: Math.round(co2SavedKg * 100) / 100,
        treesEquivalent: Math.round(treesEquivalent * 10) / 10,
        fuelSavedLiters: Math.round(fuelSavedLiters * 10) / 10,
        carbonScore: Math.min(100, Math.round((savedKm / 500) * 100)) // Heuristic score based on savings
    }
}
