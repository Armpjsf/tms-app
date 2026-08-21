/**
 * Enterprise ESG (Environmental, Social, and Governance) Utilities
 * Hybrid Calculation: Supports both exact fuel volume (Own Fleet) and distance-based estimation (Subcontractors)
 * Certified Alignment: Thailand Greenhouse Gas Management Organization (TGO / อบก.) Standards.
 */

export const TGO_STANDARDS_METADATA = {
    organization: "Thailand Greenhouse Gas Management Organization (Public Organization) - TGO / อบก.",
    efVersion: "TGO Emission Factor (CFP) Update 6 — April 2026 (Truck Transportations, tonne-km) + Mobile Combustion 2024",
    unit: "kg CO2e per Liter fuel consumed (Scope 1) / kg CO2e per km at rated full load (Scope 3, from tonne-km) — Well-to-Wheel (TTW + WTT)",
    scopes: {
        scope1: "Direct GHG Emissions (Company-owned / Controlled Vehicles - Exact Volume)",
        scope3: "Category 4: Upstream Transportation & Distribution (Subcontractor / Sub-fleet - Distance Estimated)"
    }
}

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
    calculationMethod: 'Exact Volume' | 'Distance Estimated' // บอกว่าใช้วิธีไหนคำนวณ
    ghgScope: 'Scope 1' | 'Scope 3' // จำแนกตามขอบเขต อบก. (Scope 1 = รถบริษัท, Scope 3 = รถร่วม)
}

// TTW (Tank-to-Wheel): คาร์บอนจากการเผาไหม้เชื้อเพลิงในการวิ่งจริง (kgCO2e/ลิตร)
export const TGO_EMISSION_FACTORS: Record<string, number> = {
    'Diesel_B7': 2.5504,   // อบก. Mobile Combustion ประกาศปี 2569 — ดีเซล B7 (kgCO2e/ลิตร)
    'Gasoline_E10': 2.1815, // เบนซิน/แก๊สโซฮอล์ E10 (kgCO2e/ลิตร)
    'default': 2.5504
}

// WTT (Well-to-Tank): คาร์บอนต้นน้ำของเชื้อเพลิง — การขุด กลั่น และขนส่งน้ำมัน
// ก่อนถึงถังรถ (kgCO2e/ลิตร). Well-to-Wheel (WTW) = TTW + WTT ตาม ISO 14083/GLEC.
// ค่าอ้างอิงดีเซล ~0.60 kgCO2e/L (สัดส่วน WTT/TTW ≈ 0.22 ของค่าเผาไหม้).
export const TGO_WTT_FACTORS: Record<string, number> = {
    'Diesel_B7': 0.60,
    'Gasoline_E10': 0.49,
    'default': 0.60
}

// สัดส่วน WTT ต่อ TTW ที่ใช้ประเมินค่าเริ่มต้นของ freight WTT ต่อ กม.
const WTT_TO_TTW_RATIO = 0.235

export const VEHICLE_FUEL_MAP: Record<string, string> = {
    '4-Wheel': 'Diesel_B7',
    '6-Wheel': 'Diesel_B7',
    '10-Wheel': 'Diesel_B7',
    'Motorcycle': 'Gasoline_E10',
    'default': 'Diesel_B7'
}

// อัตราสิ้นเปลืองเฉลี่ย (ไว้ใช้กรณีรถร่วม ที่มีแค่ระยะทาง GPS)
export const FUEL_EFFICIENCY: Record<string, number> = {
    '4-Wheel': 12, // KM/L
    '6-Wheel': 8,
    '10-Wheel': 4,
    'Motorcycle': 40,
    'default': 10
}

/**
 * TGO freight emission factors (kgCO2e per tonne-km) at 100% loading, normal
 * road ("วิ่งปกติ"), diesel B7 — TGO Emission Factor (CFP) Update 6, April 2026,
 * "Truck Transportations". Paired with each class's rated payload (ตัน) so a
 * fully-loaded truck of that class emits `payload × ef` per km.
 *
 * Verified against the TGO 2026 factor sheet:
 *   4-wheel pickup  1.5 t  → EF 0.2153
 *   6-wheel (large) 11  t  → EF 0.0613
 *   10-wheel        16  t  → EF 0.0454
 * (Company runs all trucks on normal roads; 6-wheel uses the standard large
 *  class per management decision — not split by size.)
 */
const TGO_FREIGHT_EF_TKM: Record<string, { payloadTonnes: number; ef: number }> = {
    '4-Wheel':   { payloadTonnes: 1.5, ef: 0.2153 },
    'Pickup':    { payloadTonnes: 1.5, ef: 0.2153 },
    '6-Wheel':   { payloadTonnes: 11,  ef: 0.0613 },
    '10-Wheel':  { payloadTonnes: 16,  ef: 0.0454 },
    'default':   { payloadTonnes: 11,  ef: 0.0613 }, // treat unknown trucks as a 6-wheel
}

// Per-km CO2 at rated full load (payload × tonne-km EF). This is the correct
// Scope-3 (distance-estimated) freight factor per ISO 14083 / GLEC, replacing
// the old fuel-economy guess. Motorcycle isn't in the TGO truck table so it
// keeps a fuel-based figure (negligible for freight).
export const CO2_COEFFICIENTS: Record<string, number> = {
    '4-Wheel': roundTo(TGO_FREIGHT_EF_TKM['4-Wheel'].payloadTonnes * TGO_FREIGHT_EF_TKM['4-Wheel'].ef, 4),   // ~0.323 kgCO2/km
    'Pickup': roundTo(TGO_FREIGHT_EF_TKM['Pickup'].payloadTonnes * TGO_FREIGHT_EF_TKM['Pickup'].ef, 4),      // ~0.323
    '6-Wheel': roundTo(TGO_FREIGHT_EF_TKM['6-Wheel'].payloadTonnes * TGO_FREIGHT_EF_TKM['6-Wheel'].ef, 4),   // ~0.674
    '10-Wheel': roundTo(TGO_FREIGHT_EF_TKM['10-Wheel'].payloadTonnes * TGO_FREIGHT_EF_TKM['10-Wheel'].ef, 4),// ~0.726
    'Motorcycle': roundTo(2.1815 / 40, 4),   // ~0.055 kgCO2/km (fuel-based, not in TGO truck table)
    'default': roundTo(TGO_FREIGHT_EF_TKM['default'].payloadTonnes * TGO_FREIGHT_EF_TKM['default'].ef, 4),   // ~0.674
}

// WTT freight coefficients (kgCO2e/km): ต้นน้ำของเชื้อเพลิงต่อ กม. สำหรับรถแต่ละชนิด
// ประเมินเริ่มต้นจาก CO2_COEFFICIENTS (TTW ต่อ กม.) × สัดส่วน WTT/TTW — admin ปรับได้จริง
// ผ่านตาราง tgo_freight_factors (คอลัมน์ wtt_per_km). WTW ต่อ กม. = CO2_COEFFICIENTS + ค่านี้.
export const WTT_FREIGHT_COEFFICIENTS: Record<string, number> = Object.fromEntries(
    Object.entries(CO2_COEFFICIENTS).map(([k, v]) => [k, roundTo(v * WTT_TO_TTW_RATIO, 4)])
)

function roundTo(n: number, d: number): number {
    const f = 10 ** d
    return Math.round(n * f) / f
}

/**
 * Live carbon factors, optionally sourced from the DB (see
 * lib/actions/carbon-factors.ts) so the /settings/esg screen can drive the
 * calculation. When omitted, the hardcoded TGO defaults above are used.
 */
export type CarbonFactors = {
    fuelEF?: Record<string, number>          // TTW kgCO2e per liter, keyed by fuel_code
    fuelWTT?: Record<string, number>         // WTT kgCO2e per liter, keyed by fuel_code
    freightPerKm?: Record<string, number>    // TTW kgCO2e per km at rated load, keyed by vehicle type
    freightWTTPerKm?: Record<string, number> // WTT kgCO2e per km, keyed by vehicle type
}

/**
 * คำนวณการปล่อยคาร์บอนต่อ 1 ใบงาน ตามมาตรฐาน อบก.
 * @param distanceKm ระยะทางวิ่งจริง (จาก GPS หรือการจัดรูท)
 * @param actualFuelLiters ลิตรน้ำมันที่เติมจริง (ใส่ null หากเป็นรถร่วมที่ไม่รู้ตัวเลข)
 * @param vehicleType ประเภทรถ
 * @param factors ค่าจาก DB (ถ้ามี) — ไม่ส่งมาจะใช้ค่า hardcode มาตรฐาน
 */
export function calculateJobEmissions(
    distanceKm: number,
    actualFuelLiters: number | null,
    vehicleType = 'default',
    factors?: CarbonFactors
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
    let method: 'Exact Volume' | 'Distance Estimated' = 'Distance Estimated'
    let ghgScope: 'Scope 1' | 'Scope 3' = 'Scope 3'

    // Logic แบ่งแยกวิธีคำนวณ และ Scope ของ อบก. — คิดแยก TTW และ WTT แล้วรวมเป็น WTW
    if (actualFuelLiters !== null && actualFuelLiters > 0) {
        // กรณีรถบริษัท (Scope 1): พนักงานกรอกลิตรที่เติมมาให้ในระบบ → แม่นสุด
        fuelUsedLiters = actualFuelLiters
        method = 'Exact Volume'
        ghgScope = 'Scope 1'
        ttwKg = fuelUsedLiters * efValue          // การเผาไหม้ในถัง→ล้อ
        wttKg = fuelUsedLiters * wttFuel          // ต้นน้ำของเชื้อเพลิง
    } else {
        // กรณีรถร่วม (Scope 3): ไม่รู้ลิตรน้ำมัน ใช้ค่า EF ขนส่งของ อบก. (tonne-km ที่
        // เต็มพิกัด) แปลงเป็น kgCO2e/km ต่อชนิดรถ — ตรงมาตรฐาน ISO 14083/GLEC
        // มากกว่าการเดาอัตราสิ้นเปลืองเดิม. ลิตรที่รายงานคำนวณย้อนกลับจาก TTW
        // เพื่อให้ TTW = ลิตร × EF ยังคงสอดคล้องกัน (audit ได้)
        const ttwPerKm = freightMap[vehicleType] ?? freightMap['default'] ?? CO2_COEFFICIENTS['default']
        const wttPerKm = freightWTTMap[vehicleType] ?? freightWTTMap['default'] ?? 0
        ttwKg = distanceKm * ttwPerKm
        wttKg = distanceKm * wttPerKm
        fuelUsedLiters = efValue > 0 ? ttwKg / efValue : 0
        method = 'Distance Estimated'
        ghgScope = 'Scope 3'
    }

    const co2EmissionsKg = ttwKg + wttKg          // Well-to-Wheel รวม

    // 1 Tree absorbs approx 22kg of CO2 per year (TGO baseline standard)
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



