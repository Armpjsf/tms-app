"use server"

/**
 * สร้างไฟล์ Excel "ใบจ่ายพนักงาน" ตามแม่แบบแอดมิน PCG (3 แท็บ):
 *   1) สรุปจ่าย   — 1 แถวต่อผู้รับเงิน (คนขับ + เด็กรถ) พร้อม WHT 3% / ยอดโอน (สูตร)
 *   2) <ชื่อคนขับ> — 1 แถวต่องาน: ราคา + ค่าใช้จ่ายแยกคอลัมน์ + รวม (สูตร)
 *   3) <ชื่อเด็กรถ> — โครงเดียวกับคนขับ แต่ ราคา = คนขับ − 200, ค่าขึ้นชั้น = เท่าคนขับ (สูตรอ้างอิงแท็บคนขับ)
 *
 * ช่องที่ระบบยังไม่มีข้อมูล (เลขบัตรปชช./ที่อยู่/หักค่ารถ/ค่าประกันสินค้า/TRACKING)
 * เว้นว่างให้แอดมินคีย์มือ — คอลัมน์ยึดตามแม่แบบครบ
 */

import ExcelJS from "exceljs"
import { createAdminClient } from "@/utils/supabase/server"

type JobRow = {
    Job_ID: string
    Plan_Date: string | null
    Origin_Location: string | null
    Dest_Location: string | null
    Route_Name: string | null
    Est_Distance_KM: number | null
    Cost_Driver_Total: number | null
    Driver_Name: string | null
    extra_costs_json: string | unknown[] | null
    original_destinations_json: string | unknown[] | null
}

type ExtraCost = { type?: string; cost_driver?: number | string }

const HELPER_RATE_DISCOUNT = 200 // เด็กรถ = คนขับ − 200

// keyword จับค่าใช้จ่ายเข้าคอลัมน์ย่อยของแม่แบบ
const KW = {
    addStop: ['เพิ่มจุด'],
    floor: ['ขึ้นชั้น', 'แรงงาน', 'ยกของ'],
    arrange: ['จัดเรียง'],
    unload: ['ลงสินค้า', 'ลงของ'],
    fuel: ['ประหยัดน้ำมัน', 'น้ำมัน'],
}
const ALL_KW = [...KW.addStop, ...KW.floor, ...KW.arrange, ...KW.unload, ...KW.fuel]

function parseExtras(raw: unknown): ExtraCost[] {
    let v = raw
    if (typeof v === 'string') { try { v = JSON.parse(v) } catch { return [] } }
    return Array.isArray(v) ? (v as ExtraCost[]) : []
}
function sumKw(extras: ExtraCost[], kw: string[]): number {
    return extras.filter(e => kw.some(k => (e.type || '').includes(k)))
        .reduce((s, e) => s + (Number(e.cost_driver) || 0), 0)
}
// ค่าที่ไม่เข้ากลุ่มไหน → รวมเข้าคอลัมน์สุดท้าย (ค่าประหยัดน้ำมัน/อื่นๆ) กันเงินตกหล่น
function sumUnmatched(extras: ExtraCost[]): number {
    return extras.filter(e => !ALL_KW.some(k => (e.type || '').includes(k)))
        .reduce((s, e) => s + (Number(e.cost_driver) || 0), 0)
}

function allDrops(job: JobRow): string {
    let v: unknown = job.original_destinations_json
    if (typeof v === 'string') { try { v = JSON.parse(v) } catch { v = null } }
    if (Array.isArray(v)) {
        const names = v.map(d => String((d as { name?: unknown })?.name ?? '').trim()).filter(Boolean)
        if (names.length > 0) return names.join(' , ')
    }
    return job.Dest_Location || job.Route_Name || ''
}

function fmtPeriod(dates: string[]): string {
    const ds = dates.map(d => String(d).slice(0, 10)).filter(Boolean).sort()
    if (ds.length === 0) return ''
    const toParts = (s: string) => { const [y, m, d] = s.split('-'); return { d: Number(d), m: Number(m), y: Number(y) + 543 } }
    const a = toParts(ds[0]), b = toParts(ds[ds.length - 1])
    if (a.m === b.m && a.y === b.y) return `${a.d}-${b.d}/${a.m}/${a.y}`
    return `${a.d}/${a.m}/${a.y}-${b.d}/${b.m}/${b.y}`
}

// ชื่อชีตปลอดภัย (ตัดอักขระต้องห้าม + ยาวไม่เกิน 31)
function safeSheetName(name: string, fallback: string): string {
    const cleaned = (name || fallback).replace(/[\[\]\:\*\?\/\\]/g, ' ').trim().slice(0, 31)
    return cleaned || fallback
}

const DETAIL_HEADERS = ['วันที่', 'TRACKING', 'ที่ขึ้นของ', 'จุดลงสินค้า', 'ระยะทาง', 'ราคา',
    'เพิ่มจุด', 'ค่าขึ้นชั้น', 'ค่าจัดเรียง', 'ค่าลงสินค้า', 'ค่าประหยัดน้ำมัน', 'รวม']

const SUMMARY_HEADERS = ['ลำดับที่', 'ผู้รับเงิน/คู่ค้า', 'ชื่อ-นามสกุล', 'เลขที่บัญชี', 'ธนาคาร', 'ที่อยู่',
    'เลขบัตรประชาชน', 'รายได้', 'ค่าเคลม', 'หักค่ารถ', 'ค่าประกันสินค้า', 'อื่นๆ', 'คงเหลือ',
    'หัก ณ ที่จ่าย 3%', 'ยอดโอน', 'รอบวันที่', 'หมายเหตุ', 'ภงด.']

function buildDetailSheet(
    ws: ExcelJS.Worksheet,
    jobs: JobRow[],
    opts: {
        helperOf?: string        // ถ้าเป็นแท็บเด็กรถ → อ้างอิงราคา/ขึ้นชั้นจากแท็บคนขับชื่อนี้
        splitWithHelper?: boolean // แท็บคนขับที่มีเด็กรถ → ราคาคนขับ = (ยอดรวม+200)/2
    }
) {
    ws.addRow(DETAIL_HEADERS)
    ws.getRow(1).font = { bold: true }
    const helperRef = opts.helperOf ? `'${opts.helperOf.replace(/'/g, "''")}'` : null

    jobs.forEach((job, i) => {
        const r = i + 2 // แถวข้อมูลเริ่มที่ 2
        const extras = parseExtras(job.extra_costs_json)
        const date = job.Plan_Date ? new Date(job.Plan_Date) : null

        // Cost_Driver_Total = ยอดรวมทั้งคู่ (คนขับ+เด็กรถ) เมื่อมีเด็กรถ
        // แยกจ่าย: คนขับ = (รวม+200)/2, เด็กรถ = (รวม−200)/2 = คนขับ−200
        const total = Number(job.Cost_Driver_Total) || 0
        const floor = sumKw(extras, KW.floor)
        const addStop = sumKw(extras, KW.addStop)
        const arrange = sumKw(extras, KW.arrange)
        const unload = sumKw(extras, KW.unload)
        const fuelPlusOther = sumKw(extras, KW.fuel) + sumUnmatched(extras)

        // ราคาฝั่งคนขับ (แท็บคนขับ): มีเด็กรถ → split, ไม่มี → เต็มยอด
        const driverPrice = total > 0
            ? (opts.splitWithHelper ? (total + HELPER_RATE_DISCOUNT) / 2 : total)
            : ''

        const row = ws.addRow([
            date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : '',
            '', // TRACKING — เว้นให้คีย์มือ
            job.Origin_Location || '',
            allDrops(job),
            Number(job.Est_Distance_KM) || '',
            helperRef ? { formula: `MAX(${helperRef}!F${r}-${HELPER_RATE_DISCOUNT},0)` } : driverPrice,
            helperRef ? '' : (addStop || ''),
            helperRef ? { formula: `${helperRef}!H${r}` } : (floor || ''),
            helperRef ? '' : (arrange || ''),
            helperRef ? '' : (unload || ''),
            helperRef ? '' : (fuelPlusOther || ''),
            { formula: `F${r}+G${r}+H${r}+I${r}+J${r}+K${r}` }, // รวม
        ])
        if (date) row.getCell(1).numFmt = 'd/m/yyyy'
    })

    const lastRow = jobs.length + 1
    const totalRow = jobs.length + 3
    ws.getCell(`K${totalRow}`).value = 'รวม'
    ws.getCell(`L${totalRow}`).value = jobs.length > 0 ? { formula: `SUM(L2:L${lastRow})` } : 0
    ws.getCell(`K${totalRow + 1}`).value = 'หัก ณ ที่จ่าย 3%'
    ws.getCell(`L${totalRow + 1}`).value = { formula: `L${totalRow}*0.03` }
    ws.getCell(`K${totalRow + 2}`).value = 'คงเหลือ'
    ws.getCell(`L${totalRow + 2}`).value = { formula: `L${totalRow}-L${totalRow + 1}` }
    ws.getRow(totalRow).font = { bold: true }

    // ความกว้างคอลัมน์อ่านง่าย
    ws.getColumn(1).width = 12
    ws.getColumn(3).width = 10
    ws.getColumn(4).width = 60
    for (const c of [5, 6, 7, 8, 9, 10, 11, 12]) ws.getColumn(c).width = 12
}

export async function generateCrewPaymentXlsx(input: {
    jobIds: string[]
    driverName: string
    helperName?: string
}): Promise<{ success: true; filename: string; base64: string } | { success: false; message: string }> {
    try {
        const { jobIds, driverName } = input
        const helperName = (input.helperName || '').trim()
        if (!jobIds || jobIds.length === 0) return { success: false, message: 'ยังไม่ได้เลือกงาน' }

        const supabase = createAdminClient()
        const { data: jobsRaw, error } = await supabase
            .from('Jobs_Main')
            .select('Job_ID, Plan_Date, Origin_Location, Dest_Location, Route_Name, Est_Distance_KM, Cost_Driver_Total, Driver_Name, extra_costs_json, original_destinations_json')
            .in('Job_ID', jobIds)
        if (error) return { success: false, message: error.message }
        const jobs = ((jobsRaw || []) as JobRow[]).sort((a, b) =>
            String(a.Plan_Date || '').localeCompare(String(b.Plan_Date || '')))
        if (jobs.length === 0) return { success: false, message: 'ไม่พบงานที่เลือก' }

        // ธนาคารคนขับ
        const { data: driver } = await supabase
            .from('Master_Drivers')
            .select('Driver_Name, Bank_Name, Bank_Account_No, Bank_Account_Name')
            .eq('Driver_Name', driverName)
            .maybeSingle()

        const period = fmtPeriod(jobs.map(j => j.Plan_Date || ''))
        const wb = new ExcelJS.Workbook()

        const hasHelper = !!helperName
        const driverSheetName = safeSheetName(driverName, 'คนขับ')
        const wsDriver = wb.addWorksheet(driverSheetName)
        buildDetailSheet(wsDriver, jobs, { splitWithHelper: hasHelper })

        let helperSheetName: string | null = null
        if (hasHelper) {
            helperSheetName = safeSheetName(helperName, 'เด็กรถ')
            if (helperSheetName === driverSheetName) helperSheetName = safeSheetName(`${helperName} (เด็กรถ)`, 'เด็กรถ')
            const wsHelper = wb.addWorksheet(helperSheetName)
            buildDetailSheet(wsHelper, jobs, { helperOf: driverSheetName })
        }

        // ===== แท็บสรุปจ่าย (วางเป็นแท็บแรก) =====
        const wsSum = wb.addWorksheet('สรุปจ่าย')
        wb.worksheets.unshift(wb.worksheets.pop()!) // ย้ายสรุปจ่ายขึ้นหน้าสุด

        wsSum.mergeCells(1, 1, 1, SUMMARY_HEADERS.length)
        wsSum.getCell('A1').value = 'แบบฟอร์มสรุปการจ่ายเงินรถร่วมสุราษฎร์ธานี'
        wsSum.getCell('A1').font = { bold: true, size: 14 }
        wsSum.getCell('A1').alignment = { horizontal: 'center' }
        wsSum.addRow(SUMMARY_HEADERS)
        wsSum.getRow(2).font = { bold: true }

        const recipients: { seq: number; name: string; sheet: string }[] = [
            { seq: 1, name: driverName, sheet: driverSheetName },
        ]
        if (helperSheetName) recipients.push({ seq: 2, name: helperName, sheet: helperSheetName })

        const detailTotalRow = jobs.length + 3 // แถว "รวม" ในแท็บ detail
        recipients.forEach((rc) => {
            const r = wsSum.rowCount + 1
            const q = `'${rc.sheet.replace(/'/g, "''")}'`
            const isDriver = rc.seq === 1
            const bank = isDriver ? driver : null
            wsSum.addRow([
                rc.seq,
                '',                                   // ผู้รับเงิน/คู่ค้า (คีย์มือ)
                bank?.Bank_Account_Name || rc.name,   // ชื่อ-นามสกุล
                bank?.Bank_Account_No || '',          // เลขที่บัญชี (เด็กรถเว้นให้คีย์)
                bank?.Bank_Name || '',                // ธนาคาร
                '',                                   // ที่อยู่ (คีย์มือ)
                '',                                   // เลขบัตรประชาชน (คีย์มือ)
                { formula: `${q}!L${detailTotalRow}` },      // รายได้ = ยอดรวมแท็บนั้น
                '', '', '', '',                        // ค่าเคลม/หักค่ารถ/ค่าประกัน/อื่นๆ (คีย์มือ)
                { formula: `H${r}-I${r}-J${r}-K${r}-L${r}` }, // คงเหลือ
                { formula: `M${r}*0.03` },                    // หัก ณ ที่จ่าย 3%
                { formula: `M${r}-N${r}` },                   // ยอดโอน
                period,                                // รอบวันที่
                '', '',                                // หมายเหตุ/ภงด.
            ])
        })

        const widths = [8, 16, 24, 16, 14, 20, 16, 12, 10, 10, 12, 10, 12, 14, 12, 14, 14, 8]
        widths.forEach((w, i) => { wsSum.getColumn(i + 1).width = w })

        const buf = await wb.xlsx.writeBuffer()
        const base64 = Buffer.from(buf).toString('base64')
        const safeDriver = driverName.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 30)
        return { success: true, filename: `จ่ายพนักงาน_${safeDriver}_${period}.xlsx`, base64 }
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : 'สร้างไฟล์ไม่สำเร็จ' }
    }
}
