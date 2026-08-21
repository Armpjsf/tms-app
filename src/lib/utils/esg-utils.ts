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

/**
 * สัดส่วนการปล่อยคาร์บอนของเที่ยวกลับ (รถเปล่า) เทียบกับเที่ยวไป (บรรทุกเต็ม)
 * ตามหลัก ISO 14083/GLEC เที่ยวกลับที่วิ่งรถเปล่าปล่อยน้อยกว่าเพราะน้ำหนักลดลง
 *
 * ค่า default 0.65 อ้างอิง DEFRA 2025 UK GHG Conversion Factors (all-HGV, kgCO2e/km):
 *   0% laden (empty) = 0.660, 100% laden (full) = 1.012 → 0.660/1.012 ≈ 0.65
 * (สอดคล้องกับ HBEFA/COPERT ที่ให้รถเปล่าใช้เชื้อเพลิง ~60–70% ของรถเต็ม)
 * ค่านี้เป็น fallback — ค่าจริงแก้ได้ที่ /settings/esg (ตาราง esg_parameters.empty_return_ratio)
 */
export const EMPTY_RETURN_RATIO = 0.65

/**
 * ตัวคูณระยะทางเทียบเท่าการปล่อยของ 1 เที่ยว (ไป-กลับ):
 *   เที่ยวไป (เต็ม) 1.0 + เที่ยวกลับ (เปล่า) × EMPTY_RETURN_RATIO
 * ใช้คูณกับระยะทางเที่ยวเดียว (one-way km) เพื่อได้ km เทียบเท่าสำหรับคำนวณคาร์บอน
 * หมายเหตุ: ค่านี้ใช้กับ "การปล่อย" เท่านั้น — ระยะทางที่แสดงผลให้ใช้ ×2 จริง
 */
export const ROUND_TRIP_EMISSION_FACTOR = 1 + EMPTY_RETURN_RATIO // 1.65

/**
 * อัตราการดูดซับคาร์บอนของต้นไม้ (kgCO2/ต้น/ปี) สำหรับคำนวณ "เทียบเท่าปลูกต้นไม้"
 * ค่า default 9.5 อ้างอิง TGO/อบก. (LESS): ต้นไม้ 1 ต้นกักเก็บคาร์บอนเพิ่มขึ้น ~9.5 kgCO2/ปี
 * (วิธีเข้มของ T-VER ใช้สมการแอลโลเมตรีรายต้น/รายชนิด — ค่า 9.5 เป็นค่าสื่อสารเฉลี่ย)
 * ปรับได้ที่ /settings/esg (ตาราง esg_parameters.tree_absorb_kg_per_year) — ค่านี้เป็น fallback
 */
export const TREE_ABSORB_KG_PER_YEAR = 9.5

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
    freightEfTkm?: Record<string, number>    // GLEC tonne-km EF (kgCO2e/tonne-km) ต่อชนิดรถ จาก DB
    emptyReturnRatio?: number                // สัดส่วนปล่อยเที่ยวกลับรถเปล่า (0–1)
    roundTripEmissionFactor?: number         // ตัวคูณระยะเทียบเท่าการปล่อยไป-กลับ = 1 + emptyReturnRatio
    treeAbsorbKgPerYear?: number             // อัตราดูดซับคาร์บอนต้นไม้ (kgCO2/ต้น/ปี)
}

/**
 * คำนวณการปล่อยคาร์บอนต่อ 1 ใบงาน ตามแนวทาง DHL GoGreen Plus & GLEC Framework (ISO 14083)
 * @param distanceKm ระยะทาง "เที่ยวเดียว" (one-way, กม.) — ห้ามคูณไป-กลับมาก่อน
 * @param actualFuelLiters ลิตรน้ำมันที่เติมจริง (ใส่ null หากเป็นรถร่วม)
 * @param vehicleType ประเภทรถ
 * @param factors ค่าจาก DB (ถ้ามี)
 * @param cargoWeightTonnes น้ำหนักสินค้าจริงในใบงาน (ตัน) — หากมีจะคำนวณ Tonne-KM ตรงแบบ GLEC
 * @param emptyReturnRatio ถ้า >0 จะบวก "เที่ยวกลับรถเปล่า" แบบแยกขา (per-km × ratio)
 *        โดยไม่แตะ tonne-km ของสินค้า (กันการนับซ้ำ / Double Counting)
 * @param fuelTypeOverride ระบุประเภทเชื้อเพลิงตรงๆ สำหรับ Scope 1 (ถ้าไม่ส่ง ใช้ VEHICLE_FUEL_MAP)
 */
export function calculateJobEmissions(
    distanceKm: number,
    actualFuelLiters: number | null,
    vehicleType = 'default',
    factors?: CarbonFactors,
    cargoWeightTonnes?: number | null,
    emptyReturnRatio?: number | null,
    fuelTypeOverride?: string | null
): JobESGImpact {
    const fuelEFMap = factors?.fuelEF ?? TGO_EMISSION_FACTORS
    const fuelWTTMap = factors?.fuelWTT ?? TGO_WTT_FACTORS
    const freightMap = factors?.freightPerKm ?? CO2_COEFFICIENTS
    const freightWTTMap = factors?.freightWTTPerKm ?? WTT_FREIGHT_COEFFICIENTS
    const freightEfTkmMap = factors?.freightEfTkm ?? {}
    // A: เชื้อเพลิงจากพารามิเตอร์ก่อน แล้ว fallback ตามชนิดรถ
    const fuelType = fuelTypeOverride || VEHICLE_FUEL_MAP[vehicleType] || VEHICLE_FUEL_MAP['default']
    const efValue = fuelEFMap[fuelType] ?? fuelEFMap['default'] ?? TGO_EMISSION_FACTORS['default']
    const wttFuel = fuelWTTMap[fuelType] ?? fuelWTTMap['default'] ?? 0

    // per-km ของรถ "เต็มพิกัด" (kgCO2e/km) — ใช้ทั้ง branch ประเมิน และคิดเที่ยวกลับรถเปล่า
    const ttwPerKm = freightMap[vehicleType] ?? freightMap['default'] ?? CO2_COEFFICIENTS['default']
    const wttPerKm = freightWTTMap[vehicleType] ?? freightWTTMap['default'] ?? 0
    const ratio = (emptyReturnRatio && emptyReturnRatio > 0) ? emptyReturnRatio : 0

    // D: coerce กันค่า string/null จาก DB
    const fuelLiters = Number(actualFuelLiters) || 0
    const cargoWeight = Number(cargoWeightTonnes) || 0

    let fuelUsedLiters = 0
    let ttwKg = 0
    let wttKg = 0
    let method: 'Exact Volume (Primary Data)' | 'GLEC Tonne-KM (Shipment Weight)' | 'GLEC Distance Estimated (Secondary Data)' = 'GLEC Distance Estimated (Secondary Data)'
    let ghgScope: 'Scope 1' | 'Scope 3' = 'Scope 3'

    // 1. Primary Data (Scope 1): น้ำมันเติมจริง (Company Fleet)
    //    ลิตรจริงสะท้อนระยะที่วิ่งจริงอยู่แล้ว จึงไม่บวกเที่ยวกลับสังเคราะห์
    if (fuelLiters > 0) {
        fuelUsedLiters = fuelLiters
        method = 'Exact Volume (Primary Data)'
        ghgScope = 'Scope 1'
        ttwKg = fuelUsedLiters * efValue
        wttKg = fuelUsedLiters * wttFuel
    }
    // 2. Secondary Data (Scope 3): GLEC Tonne-KM ตามน้ำหนักสินค้าจริง
    //    เที่ยวไป (loaded) คิดตาม tonne-km ของสินค้า; เที่ยวกลับ (empty) คิดแบบ per-km ไม่มีสินค้า
    else if (cargoWeight > 0) {
        // B: ef_tkm จาก DB ต่อชนิดรถก่อน แล้ว fallback ค่า hardcode
        const glecTonKmEf = freightEfTkmMap[vehicleType]
            ?? DHL_FREIGHT_EF_TKM[vehicleType]?.ef ?? DHL_FREIGHT_EF_TKM['default'].ef
        // loaded leg (เที่ยวไป) — TTW ตาม tonne-km ของสินค้า
        ttwKg = (cargoWeight * distanceKm) * glecTonKmEf
        // C: WTT ขาไปผูกกับเชื้อเพลิงที่เผาจริง (ไม่ใช่ระยะทางดิบ) → consistent กับ TTW/Scope 1
        const loadedLiters = efValue > 0 ? ttwKg / efValue : 0
        wttKg = loadedLiters * wttFuel
        // empty return leg (เที่ยวกลับรถเปล่า) — per-km เต็ม × ratio, ไม่ผูกกับน้ำหนักสินค้า
        ttwKg += distanceKm * ttwPerKm * ratio
        wttKg += distanceKm * wttPerKm * ratio
        fuelUsedLiters = efValue > 0 ? ttwKg / efValue : 0
        method = 'GLEC Tonne-KM (Shipment Weight)'
        ghgScope = 'Scope 3'
    }
    // 3. Secondary Data (Scope 3): GLEC Estimated ตามพิกัดประเภทรถ (Estimated Fleet Payload)
    //    ทั้งเที่ยวไป (เต็ม) + เที่ยวกลับ (เปล่า×ratio) = per-km × (1 + ratio)
    else {
        ttwKg = distanceKm * ttwPerKm * (1 + ratio)
        wttKg = distanceKm * wttPerKm * (1 + ratio)
        fuelUsedLiters = efValue > 0 ? ttwKg / efValue : 0
        method = 'GLEC Distance Estimated (Secondary Data)'
        ghgScope = 'Scope 3'
    }

    const co2EmissionsKg = ttwKg + wttKg // Well-to-Wheel (WTW)

    // อัตราดูดซับของต้นไม้ (kgCO2/ต้น/ปี) — ตั้งค่าได้จาก DB, fallback ค่าคงที่
    const treeKg = factors?.treeAbsorbKgPerYear ?? TREE_ABSORB_KG_PER_YEAR
    const treesEquivalentToOffset = treeKg > 0 ? co2EmissionsKg / treeKg : 0

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
