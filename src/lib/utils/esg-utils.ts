/**
 * Enterprise ESG (Environmental, Social, and Governance) Utilities
 * DHL GoGreen Plus & GLEC Framework Alignment (ISO 14083 / TGO Certified Standards)
 * Supports Primary Fuel Volume (Scope 1 Own Fleet) & GLEC Tonne-Km Intensity (Scope 3 Subcontractors)
 */

export const DHL_GLEC_METADATA = {
    organization: "DHL GoGreen Plus & GLEC Framework v3.0 (ISO 14083 / TGO Certified Alignment)",
    efVersion: "GLEC Road Freight Intensity (kgCO2e per ton-km) + TGO CFP Update 6 (2026)",
    unit: "kg CO2e per Tonne-KM (Scope 3) / kg CO2e per Liter (Scope 1) — Well-to-Wheel (WTW = TTW + WTT)",
    scopes: {
        scope1: "Direct GHG Emissions (Company-owned Fleet - Primary Fuel Data)",
        scope3: "Category 4: Upstream Transportation & Distribution (Subcontractor / Sub-fleet - GLEC Tonne-KM Standard)"
    }
}

// Retain alias for backward compatibility
export const TGO_STANDARDS_METADATA = DHL_GLEC_METADATA

export type ESGImpact = {
    co2SavedKg: number
    treesEquivalent: number
    fuelSavedLiters: number
    carbonScore: number // 0-100
}

export type JobESGImpact = {
    co2EmissionsKg: number // ปริมาณการปล่อยคาร์บอนรวม Well-to-Wheel (kgCO2e) = TTW + WTT
    ttwKg: number // Tank-to-Wheel: การเผาไหม้เชื้อเพลิงในการวิ่ง (kgCO2e)
    wttKg: number // Well-to-Tank: ต้นน้ำของเชื้อเพลิง (ผลิต/ขนส่งน้ำมัน) (kgCO2e)
    treesEquivalentToOffset: number // จำนวนต้นไม้ที่ต้องปลูกเพื่อชดเชยเที่ยววิ่งนี้
    fuelUsedLiters: number
    calculationMethod: 'Exact Volume (Primary Data)' | 'GLEC Tonne-KM (Shipment Weight)' | 'GLEC Distance Estimated (Secondary Data)' | 'Exact Volume' | 'Distance Estimated'
    ghgScope: 'Scope 1' | 'Scope 3' // จำแนกตามขอบเขต (Scope 1 = รถบริษัท, Scope 3 = รถร่วม)
}

// TTW (Tank-to-Wheel): คาร์บอนจากการเผาไหม้เชื้อเพลิงในการวิ่งจริง (kgCO2e/ลิตร)
export const TGO_EMISSION_FACTORS: Record<string, number> = {
    'Diesel_B7': 2.5504,   // ดีเซล B7 (kgCO2e/ลิตร)
    'Gasoline_E10': 2.1815, // เบนซิน/แก๊สโซฮอล์ E10 (kgCO2e/ลิตร)
    'default': 2.5504
}

// WTT (Well-to-Tank): คาร์บอนต้นน้ำของเชื้อเพลิง (kgCO2e/ลิตร). WTW = TTW + WTT
export const TGO_WTT_FACTORS: Record<string, number> = {
    'Diesel_B7': 0.60,
    'Gasoline_E10': 0.49,
    'default': 0.60
}

// สัดส่วน WTT ต่อ TTW สำหรับคำนวณ WTT ประเมินผล
const WTT_TO_TTW_RATIO = 0.235

export const VEHICLE_FUEL_MAP: Record<string, string> = {
    '4-Wheel': 'Diesel_B7',
    'Pickup': 'Diesel_B7',
    '6-Wheel': 'Diesel_B7',
    '10-Wheel': 'Diesel_B7',
    'Motorcycle': 'Gasoline_E10',
    'default': 'Diesel_B7'
}

export const FUEL_EFFICIENCY: Record<string, number> = {
    '4-Wheel': 12, // KM/L
    '6-Wheel': 8,
    '10-Wheel': 4,
    'Motorcycle': 40,
    'default': 10
}

/**
 * DHL GoGreen & GLEC Framework Intensity Factors (kgCO2e per tonne-km)
 * - Short-haul / Pickup (4-Wheel): ~0.200 kgCO2e/tkm (DHL Range 0.150 - 0.250)
 * - Medium-duty Road Freight (6-Wheel): ~0.075 kgCO2e/tkm (DHL Range 0.060 - 0.090)
 * - Heavy Long-haul Truck / Trailer (10-Wheel): ~0.050 kgCO2e/tkm (DHL Range 0.050 - 0.070)
 */
export const DHL_FREIGHT_EF_TKM: Record<string, { payloadTonnes: number; ef: number }> = {
    '4-Wheel':   { payloadTonnes: 1.5, ef: 0.200 },
    'Pickup':    { payloadTonnes: 1.5, ef: 0.200 },
    '6-Wheel':   { payloadTonnes: 11,  ef: 0.075 },
    '10-Wheel':  { payloadTonnes: 16,  ef: 0.050 },
    'default':   { payloadTonnes: 11,  ef: 0.075 },
}

// Per-km TTW CO2 at rated full load (payload × GLEC tonne-km EF)
export const CO2_COEFFICIENTS: Record<string, number> = {
    '4-Wheel': roundTo(DHL_FREIGHT_EF_TKM['4-Wheel'].payloadTonnes * DHL_FREIGHT_EF_TKM['4-Wheel'].ef, 4),   // 1.5t * 0.200 = 0.300 kgCO2/km
    'Pickup': roundTo(DHL_FREIGHT_EF_TKM['Pickup'].payloadTonnes * DHL_FREIGHT_EF_TKM['Pickup'].ef, 4),      // 0.300
    '6-Wheel': roundTo(DHL_FREIGHT_EF_TKM['6-Wheel'].payloadTonnes * DHL_FREIGHT_EF_TKM['6-Wheel'].ef, 4),   // 11t * 0.075 = 0.825 kgCO2/km
    '10-Wheel': roundTo(DHL_FREIGHT_EF_TKM['10-Wheel'].payloadTonnes * DHL_FREIGHT_EF_TKM['10-Wheel'].ef, 4),// 16t * 0.050 = 0.800 kgCO2/km
    'Motorcycle': roundTo(2.1815 / 40, 4),   // ~0.055 kgCO2/km
    'default': roundTo(DHL_FREIGHT_EF_TKM['default'].payloadTonnes * DHL_FREIGHT_EF_TKM['default'].ef, 4),   // 0.825
}

// WTT freight coefficients (kgCO2e/km)
export const WTT_FREIGHT_COEFFICIENTS: Record<string, number> = Object.fromEntries(
    Object.entries(CO2_COEFFICIENTS).map(([k, v]) => [k, roundTo(v * WTT_TO_TTW_RATIO, 4)])
)

function roundTo(n: number, d: number): number {
    const f = 10 ** d
    return Math.round(n * f) / f
}

export type CarbonFactors = {
    fuelEF?: Record<string, number>          // TTW kgCO2e per liter
    fuelWTT?: Record<string, number>         // WTT kgCO2e per liter
    freightPerKm?: Record<string, number>    // TTW kgCO2e per km at rated load
    freightWTTPerKm?: Record<string, number> // WTT kgCO2e per km
}

/**
 * คำนวณการปล่อยคาร์บอนต่อ 1 ใบงาน ตามแนวทาง DHL GoGreen Plus & GLEC Framework (ISO 14083)
 * @param distanceKm ระยะทางวิ่งจริง (กม.)
 * @param actualFuelLiters ลิตรน้ำมันที่เติมจริง (ใส่ null หากเป็นรถร่วม)
 * @param vehicleType ประเภทรถ
 * @param factors ค่าจาก DB (ถ้ามี)
 * @param cargoWeightTonnes น้ำหนักสินค้าจริงในใบงาน (ตัน) — หากมีจะคำนวณ Tonne-KM ตรงแบบ DHL
 */
export function calculateJobEmissions(
    distanceKm: number,
    actualFuelLiters: number | null,
    vehicleType = 'default',
    factors?: CarbonFactors,
    cargoWeightTonnes?: number | null
): JobESGImpact {
    const fuelEFMap = factors?.fuelEF ?? TGO_EMISSION_FACTORS
    const fuelWTTMap = factors?.fuelWTT ?? TGO_WTT_FACTORS
    const freightMap = factors?.freightPerKm ?? CO2_COEFFICIENTS
    const freightWTTMap = factors?.freightWTTPerKm ?? WTT_FREIGHT_COEFFICIENTS
    const fuelType = VEHICLE_FUEL_MAP[vehicleType] || VEHICLE_FUEL_MAP['default']
    const efValue = fuelEFMap[fuelType] ?? fuelEFMap['default'] ?? TGO_EMISSION_FACTORS['default']
    const wttFuel = fuelWTTMap[fuelType] ?? fuelWTTMap['default'] ?? 0

    let fuelUsedLiters = 0
    let ttwKg = 0
    let wttKg = 0
    let method: 'Exact Volume (Primary Data)' | 'GLEC Tonne-KM (Shipment Weight)' | 'GLEC Distance Estimated (Secondary Data)' = 'GLEC Distance Estimated (Secondary Data)'
    let ghgScope: 'Scope 1' | 'Scope 3' = 'Scope 3'

    // 1. Primary Data (Scope 1): น้ำมันเติมจริง (Company Fleet)
    if (actualFuelLiters !== null && actualFuelLiters > 0) {
        fuelUsedLiters = actualFuelLiters
        method = 'Exact Volume (Primary Data)'
        ghgScope = 'Scope 1'
        ttwKg = fuelUsedLiters * efValue
        wttKg = fuelUsedLiters * wttFuel
    } 
    // 2. Secondary Data (Scope 3): GLEC Tonne-KM ตามน้ำหนักสินค้าจริง (DHL GoGreen Model)
    else if (cargoWeightTonnes !== undefined && cargoWeightTonnes !== null && cargoWeightTonnes > 0) {
        const glecTonKmEf = DHL_FREIGHT_EF_TKM[vehicleType]?.ef ?? DHL_FREIGHT_EF_TKM['default'].ef
        const tonneKm = cargoWeightTonnes * distanceKm
        const wttPerKm = freightWTTMap[vehicleType] ?? freightWTTMap['default'] ?? 0

        ttwKg = tonneKm * glecTonKmEf
        wttKg = distanceKm * wttPerKm
        fuelUsedLiters = efValue > 0 ? ttwKg / efValue : 0
        method = 'GLEC Tonne-KM (Shipment Weight)'
        ghgScope = 'Scope 3'
    }
    // 3. Secondary Data (Scope 3): GLEC Estimated ตามพิกัดประเภทรถ (Estimated Fleet Payload)
    else {
        const ttwPerKm = freightMap[vehicleType] ?? freightMap['default'] ?? CO2_COEFFICIENTS['default']
        const wttPerKm = freightWTTMap[vehicleType] ?? freightWTTMap['default'] ?? 0
        ttwKg = distanceKm * ttwPerKm
        wttKg = distanceKm * wttPerKm
        fuelUsedLiters = efValue > 0 ? ttwKg / efValue : 0
        method = 'GLEC Distance Estimated (Secondary Data)'
        ghgScope = 'Scope 3'
    }

    const co2EmissionsKg = ttwKg + wttKg // Well-to-Wheel (WTW)

    // 1 Tree absorbs approx 22kg of CO2 per year (TGO/GLEC Standard)
    const treesEquivalentToOffset = co2EmissionsKg / 22

    return {
        co2EmissionsKg: Math.round(co2EmissionsKg * 100) / 100,
        ttwKg: Math.round(ttwKg * 100) / 100,
        wttKg: Math.round(wttKg * 100) / 100,
        treesEquivalentToOffset: Math.round(treesEquivalentToOffset * 10) / 10,
        fuelUsedLiters: Math.round(fuelUsedLiters * 10) / 10,
        calculationMethod: method,
        ghgScope: ghgScope
    }
}

export function calculateESGImpact(savedKm: number, vehicleType = 'default'): ESGImpact {
    const res = calculateJobEmissions(savedKm, null, vehicleType)

    return {
        co2SavedKg: res.co2EmissionsKg,
        treesEquivalent: res.treesEquivalentToOffset,
        fuelSavedLiters: res.fuelUsedLiters,
        carbonScore: Math.min(100, Math.round((savedKm / 500) * 100))
    }
}
