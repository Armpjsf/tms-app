import { createAdminClient } from '@/utils/supabase/server'

export interface FuelSlipExtractedData {
  vehiclePlate?: string | null
  priceTotal?: number | string | null
  liters?: number | string | null
  unitPrice?: number | string | null
  odometer?: number | string | null
  stationName?: string | null
  dateTime?: string | null
  taxIdSeller?: string | null
}

export interface FuelSlipValidationResult {
  isValid: boolean
  missingFields: string[]
  plateError?: string
  plateWarning?: string
  odometerError?: string
  odometerWarning?: string
  resolvedPlate: string
  matchedPlate: boolean
  branchId: string | null
  liters: number
  priceTotal: number
  unitPrice: number
  odometer: number
  stationName: string
  dateTime: string
  prevOdometer: number | null
  deltaKm: number | null
  kmPerLiter: number | null
  tankCapacity: number | null
  rejectionMessage?: string
  summaryText: string
}

/**
 * Snap an OCR''d license plate to a real fleet vehicle from Master_Vehicles.
 */
export async function resolveFleetPlate(
  supabase: ReturnType<typeof createAdminClient>,
  ocrPlate: string
): Promise<{ plate: string; matched: boolean; branchId: string | null; tankCapacity: number | null; currentMileage: number | null }> {
  // แปลงเลขไทย ๐-๙ -> อารบิก, ตัดอักขระซ่อน (zero-width / BOM / NBSP), แล้ว NFC
  // เพื่อกันเคสที่ OCR อ่านทะเบียนมาแล้ว byte ไม่ตรงกับที่เก็บใน DB ทั้งที่ตาเห็นเหมือนกัน
  const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
  const canon = (s: string) =>
    String(s || '')
      .replace(/[​-‍﻿ ]/g, '')
      .replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
      .normalize('NFC')

  const raw = canon(ocrPlate).replace(/\s+/g, '').trim()
  if (!raw) return { plate: '', matched: false, branchId: null, tankCapacity: null, currentMileage: null }
  try {
    const { data } = await supabase
      .from('Master_Vehicles')
      .select('Vehicle_Plate, Branch_ID, Tank_Capacity, Current_Mileage')
    
    const rows = (data || [])
      .map((v: { Vehicle_Plate?: string | null; Branch_ID?: string | null; Tank_Capacity?: number | null; Current_Mileage?: number | null }) => ({
        plate: String(v.Vehicle_Plate || '').trim(),
        branch: v.Branch_ID ?? null,
        tankCapacity: v.Tank_Capacity ? Number(v.Tank_Capacity) : null,
        currentMileage: v.Current_Mileage ? Number(v.Current_Mileage) : null
      }))
      .filter(r => r.plate)
    
    const plates = rows.map(r => r.plate)
    const findRow = (p: string) => rows.find(r => r.plate === p)
    const hit = (p: string) => {
      const row = findRow(p)
      return {
        plate: p,
        matched: true,
        branchId: row?.branch ?? null,
        tankCapacity: row?.tankCapacity ?? null,
        currentMileage: row?.currentMileage ?? null
      }
    }
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
    const digitsOf = (s: string) => (s.match(/\d/g) || []).join('')

    // 1. Exact match
    const exact = plates.find(p => norm(p) === norm(raw))
    if (exact) return hit(exact)

    const rawDigits = digitsOf(raw)

    // 2. Digit signature match
    if (rawDigits.length >= 3) {
      const byDigits = plates.filter(p => digitsOf(p) === rawDigits)
      if (byDigits.length === 1) return hit(byDigits[0])
      if (byDigits.length > 1) {
        const byFirst = byDigits.filter(p => norm(p)[0] === norm(raw)[0])
        if (byFirst.length === 1) return hit(byFirst[0])
      }
    }

    // 3. Trailing 4 or 3 digits match
    for (const n of [4, 3]) {
      if (rawDigits.length < n) continue
      const tail = rawDigits.slice(-n)
      const byTail = plates.filter(p => digitsOf(p).slice(-n) === tail)
      if (byTail.length === 1) return hit(byTail[0])
    }
  } catch {
    /* fall through */
  }
  // DEBUG: match ไม่เจอ — เก็บ byte จริงของทะเบียนที่ OCR อ่าน + รายชื่อทะเบียนในระบบ
  // เพื่อฟันธงว่าเพี้ยนที่ตัวอักษร/อักขระซ่อนตรงไหน (ลบ log block นี้ออกเมื่อแก้เสร็จ)
  try {
    const toHex = (s: string) => Buffer.from(String(s || ''), 'utf8').toString('hex')
    await supabase.from('System_Logs').insert({
      module: 'FuelPlateDebug',
      action_type: 'PLATE_NO_MATCH',
      details: {
        ocrRaw: String(ocrPlate || ''),
        ocrHex: toHex(String(ocrPlate || '')),
        canonRaw: raw,
        canonHex: toHex(raw),
      },
      created_at: new Date().toISOString(),
    })
  } catch { /* ignore */ }
  return { plate: raw, matched: false, branchId: null, tankCapacity: null, currentMileage: null }
}

/**
 * Validates a fuel receipt strictly according to business requirements:
 * 1. Must contain all mandatory fields: vehicle plate, liters, total price, station name, odometer, date.
 * 2. Plate must match a registered fleet vehicle.
 * 3. Odometer must be sane vs previous odometer (not backward, not identical, not abnormally low/high).
 */
export async function validateFuelSlip(
  supabase: ReturnType<typeof createAdminClient>,
  extracted: FuelSlipExtractedData,
  driverContext?: {
    driverId?: string
    driverName?: string
    assignedPlate?: string | null
    branchId?: string | null
  }
): Promise<FuelSlipValidationResult> {
  const missingFields: string[] = []

  // 1. Check Missing Fields
  const rawPlate = String(extracted.vehiclePlate || '').trim()
  if (!rawPlate || rawPlate === 'null' || rawPlate === '-') {
    missingFields.push('ทะเบียนรถ (ไม่พบข้อมูลทะเบียนรถบนใบเสร็จ)')
  }

  const liters = Number(extracted.liters) || 0
  if (liters <= 0) {
    missingFields.push('จำนวนลิตร (ไม่พบจำนวนลิตรที่เติม)')
  }

  const priceTotal = Number(extracted.priceTotal) || 0
  if (priceTotal <= 0) {
    missingFields.push('ยอดเงินรวม (ไม่พบยอดเงินรวมในใบเสร็จ)')
  }

  const stationName = String(extracted.stationName || '').trim()
  if (!stationName || stationName === 'null' || stationName === 'ปั๊มน้ำมัน' || stationName.length < 3) {
    missingFields.push('ชื่อปั๊มน้ำมัน/สถานีบริการ (ไม่พบชื่อสถานีหรือผู้ขายบนหัวบิล)')
  }

  const odometer = extracted.odometer != null ? Number(extracted.odometer) : 0
  if (odometer <= 0) {
    missingFields.push('เลขไมล์ (ไม่พบเลขไมล์หน้าปัดบนใบเสร็จ)')
  }

  const dateTime = String(extracted.dateTime || '').trim()
  if (!dateTime || dateTime === 'null') {
    missingFields.push('วันที่เติม (ไม่พบวันที่เติมบนใบเสร็จ)')
  }

  const unitPrice = Number(extracted.unitPrice) || (priceTotal > 0 && liters > 0 ? +(priceTotal / liters).toFixed(2) : 0)

  // 2. Resolve & Validate Vehicle Plate
  const plateRes = await resolveFleetPlate(supabase, rawPlate)
  let plateError: string | undefined
  let plateWarning: string | undefined

  if (rawPlate && !plateRes.matched) {
    plateError = `ทะเบียน "${rawPlate}" ที่อ่านได้จากใบเสร็จ ไม่พบในระบบ Fleet รถของบริษัท`
  } else if (plateRes.matched && driverContext?.assignedPlate) {
    if (plateRes.plate !== driverContext.assignedPlate) {
      plateWarning = `ทะเบียนในบิล (${plateRes.plate}) ต่างจากรถประจำตัวของคุณ (${driverContext.assignedPlate})`
    }
  }

  // 3. Odometer Analysis vs Previous Refuel / Current Mileage
  let odometerError: string | undefined
  let odometerWarning: string | undefined
  let prevOdometer: number | null = null
  let deltaKm: number | null = null
  let kmPerLiter: number | null = null

  if (plateRes.matched && odometer > 0) {
    // Find latest fuel log for this vehicle
    const { data: lastLog } = await supabase
      .from('Fuel_Logs')
      .select('Odometer, Date_Time, Liters, Log_ID')
      .eq('Vehicle_Plate', plateRes.plate)
      .not('Odometer', 'is', null)
      .order('Date_Time', { ascending: false })
      .limit(1)
      .maybeSingle()

    prevOdometer = (lastLog?.Odometer && Number(lastLog.Odometer) > 0)
      ? Number(lastLog.Odometer)
      : (plateRes.currentMileage || null)

    if (prevOdometer && prevOdometer > 0) {
      deltaKm = odometer - prevOdometer

      if (deltaKm < 0) {
        // Odometer went backward
        odometerError = `เลขไมล์ในบิล (${odometer.toLocaleString()} กม.) น้อยกว่าเลขไมล์ล่าสุดในระบบ (${prevOdometer.toLocaleString()} กม.) ลดลง ${Math.abs(deltaKm).toLocaleString()} กม. (ไมล์ถอยหลัง)`
      } else if (deltaKm === 0) {
        // Odometer is identical
        odometerError = `เลขไมล์ในบิล (${odometer.toLocaleString()} กม.) เท่ากับเลขไมล์ที่บันทึกไว้ในครั้งล่าสุดพอดี (ไม่มีการขยับระยะทาง)`
      } else if (deltaKm > 0) {
        if (liters > 0) {
          kmPerLiter = +(deltaKm / liters).toFixed(2)
        }

        if (deltaKm < 10 && liters >= 15) {
          odometerWarning = `ระยะทางวิ่งเพิ่มขึ้นเพียง ${deltaKm} กม. จากการเติมครั้งก่อน (เติม ${liters} ลิตร, อัตราสิ้นเปลือง ${kmPerLiter ?? '-'} กม./ลิตร) เลขไมล์อาจต่ำผิดปกติ`
        } else if (deltaKm > 3000) {
          odometerWarning = `ระยะทางวิ่งเพิ่มขึ้นสูงผิดปกติ (${deltaKm.toLocaleString()} กม. จากการเติมครั้งก่อน) โปรดตรวจว่าปั๊มพิมพ์เลขไมล์เกินหรือไม่`
        }
      }
    }
  }

  // 4. Tank Capacity Check
  if (plateRes.tankCapacity && liters > plateRes.tankCapacity * 1.15) {
    const overflowDiff = (liters - plateRes.tankCapacity).toFixed(1)
    odometerWarning = (odometerWarning ? odometerWarning + '\n' : '') + 
      `⚠️ ปริมาณน้ำมัน (${liters} ลิตร) เกินขนาดความจุถังน้ำมันของรถคันนี้ (${plateRes.tankCapacity} ลิตร) เกินมา ${overflowDiff} ลิตร`
  }

  // 5. Determine Overall Validity
  const isValid = missingFields.length === 0 && !plateError && !odometerError

  // 6. Build Structured Rejection Message if Invalid
  let rejectionMessage: string | undefined
  if (!isValid) {
    const lines: string[] = ['❌ [ไม่สามารถบันทึกค่าน้ำมันได้ - ข้อมูลไม่ถูกต้องหรือขาดหาย]']
    
    if (missingFields.length > 0) {
      lines.push('\n📋 พบข้อมูลสำคัญไม่ครบถ้วนในใบเสร็จ:')
      for (const f of missingFields) {
        lines.push(`  • ${f}`)
      }
    }

    if (plateError) {
      lines.push(`\n🛻 ตรวจสอบทะเบียนรถ:\n  • ${plateError}`)
    }

    if (odometerError) {
      lines.push(`\n📟 ตรวจสอบเลขไมล์:\n  • ${odometerError}`)
    }

    lines.push('\n⚠️ กรุณาติดต่อปั๊มน้ำมันเพื่อขอให้ออกใบเสร็จ/ใบกำกับภาษีใหม่ที่มีข้อมูลครบถ้วน:')
    lines.push('  1. ทะเบียนรถที่ถูกต้อง')
    lines.push('  2. เลขไมล์หน้าปัดจริง')
    lines.push('  3. จำนวนลิตรและยอดเงิน')
    lines.push('  4. ชื่อสถานีบริการ/ปั๊มน้ำมัน')
    lines.push('  5. วันที่และเวลาเติม')
    lines.push('\nแล้วถ่ายรูปส่งใหม่อีกครั้งครับ 🧾✨')

    rejectionMessage = lines.join('\n')
  }

  // 7. Build Summary Text
  const dateFormatted = dateTime ? dateTime.slice(0, 10) : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  const deltaText = deltaKm != null && deltaKm > 0 ? ` (+${deltaKm.toLocaleString()} กม. จากครั้งก่อน)` : ''
  const kmlText = kmPerLiter != null ? ` (${kmPerLiter} กม./ลิตร)` : ''
  
  const summaryText = [
    `• ทะเบียน: ${plateRes.plate || rawPlate || '-'}`,
    `• ปริมาณ: ${liters.toLocaleString()} ลิตร`,
    unitPrice > 0 ? `• ราคาต่อลิตร: ฿${unitPrice.toFixed(2)}` : null,
    `• ราคารวม: ฿${priceTotal.toLocaleString()}`,
    `• ปั๊ม: ${stationName || '-'}`,
    `• เลขไมล์: ${odometer > 0 ? odometer.toLocaleString() : '-'}${deltaText}${kmlText}`,
    `• วันที่เติม: ${dateFormatted} (จากบิล)`,
    `• แนบรูปบิล: ✓ (เก็บในระบบแล้ว)`,
  ].filter(Boolean).join('\n')

  return {
    isValid,
    missingFields,
    plateError,
    plateWarning,
    odometerError,
    odometerWarning,
    resolvedPlate: plateRes.plate || rawPlate,
    matchedPlate: plateRes.matched,
    branchId: plateRes.branchId,
    liters,
    priceTotal,
    unitPrice,
    odometer,
    stationName,
    dateTime: dateTime || new Date().toISOString(),
    prevOdometer,
    deltaKm,
    kmPerLiter,
    tankCapacity: plateRes.tankCapacity,
    rejectionMessage,
    summaryText
  }
}
