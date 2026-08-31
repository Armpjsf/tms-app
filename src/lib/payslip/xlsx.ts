import ExcelJS from "exceljs"
import type { PayslipCell, PayslipMerge, PayslipGrid } from "./types"

export type { PayslipCell, PayslipMerge, PayslipGrid } from "./types"

const MAX_COLS = 24
const MAX_ROWS = 400

function colLetterToNum(s: string): number {
  let n = 0
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n // 1-based
}

/** แปลง "A1:C2" -> {r,c,rs,cs} (0-based) */
function parseMerge(range: string): PayslipMerge | null {
  const m = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (!m) return null
  const c1 = colLetterToNum(m[1]), r1 = parseInt(m[2], 10)
  const c2 = colLetterToNum(m[3]), r2 = parseInt(m[4], 10)
  return { r: r1 - 1, c: c1 - 1, rs: r2 - r1 + 1, cs: c2 - c1 + 1 }
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value as unknown
  if (v === null || v === undefined) return ""
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    // สูตร: ใช้ค่าที่ถูกคำนวณไว้ (cached result)
    if ("formula" in o || "sharedFormula" in o) {
      const res = o.result
      if (res === null || res === undefined) return ""
      if (typeof res === "object") {
        const ro = res as Record<string, unknown>
        if (ro.error) return "" // #REF! ฯลฯ -> ว่าง
        if (ro.result !== undefined) return String(ro.result)
        return ""
      }
      if (res instanceof Date) return formatDate(res)
      return String(res)
    }
    if (v instanceof Date) return formatDate(v as Date)
    if ("richText" in o && Array.isArray(o.richText)) {
      return (o.richText as { text: string }[]).map((t) => t.text).join("")
    }
    if ("text" in o) return String(o.text)
    if ("hyperlink" in o && "text" in o) return String(o.text)
    if ("error" in o) return ""
    return ""
  }
  if (v instanceof Date) return formatDate(v as Date)
  return String(v)
}

function formatDate(d: Date): string {
  if (isNaN(d.getTime())) return ""
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const yy = String((d.getUTCFullYear() + 543) % 100).padStart(2, "0") // พ.ศ. 2 หลัก
  return `${dd}/${mm}/${yy}`
}

function isNumericValue(cell: ExcelJS.Cell): boolean {
  const v = cell.value as unknown
  if (typeof v === "number") return true
  if (v && typeof v === "object") {
    const res = (v as Record<string, unknown>).result
    if (typeof res === "number") return true
  }
  return false
}

/** อ่าน worksheet -> PayslipGrid สำหรับ render */
export function sheetToGrid(ws: ExcelJS.Worksheet): PayslipGrid {
  const merges: PayslipMerge[] = []
  const rawMerges = (ws.model?.merges || []) as string[]
  for (const r of rawMerges) {
    const pm = parseMerge(r)
    if (pm) merges.push(pm)
  }

  const usedCols = Math.min(Math.max(ws.columnCount || 1, 1), MAX_COLS)
  const cols: number[] = []
  for (let c = 1; c <= usedCols; c++) {
    const w = ws.getColumn(c).width
    cols.push(typeof w === "number" && w > 0 ? w : 10)
  }

  const rowCount = Math.min(ws.rowCount || 0, MAX_ROWS)
  const rows: PayslipCell[][] = []
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r)
    const cells: PayslipCell[] = []
    for (let c = 1; c <= usedCols; c++) {
      const cell = row.getCell(c)
      const t = cellText(cell).replace(/\r?\n/g, " ").trim()
      const cellObj: PayslipCell = { t }
      if (cell.font?.bold) cellObj.b = true
      const halign = cell.alignment?.horizontal
      if (halign === "center" || halign === "right" || halign === "left") cellObj.a = halign
      if (isNumericValue(cell)) cellObj.n = true
      cells.push(cellObj)
    }
    rows.push(cells)
  }

  // ตัดแถวว่างท้ายตารางออก
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.t === "")) rows.pop()

  return { cols, merges, rows, maxCols: usedCols }
}

/** สร้าง workbook ใหม่ที่มี sheet เดียว (ไฟล์ Excel รายคน) จาก sheet ต้นทาง */
export async function extractSingleSheetXlsx(
  sourceBuffer: Buffer,
  sheetName: string
): Promise<Buffer> {
  const src = new ExcelJS.Workbook()
  await src.xlsx.load(sourceBuffer as unknown as ArrayBuffer)
  const srcWs = src.getWorksheet(sheetName)
  if (!srcWs) throw new Error(`ไม่พบ sheet: ${sheetName}`)

  const out = new ExcelJS.Workbook()
  const ws = out.addWorksheet(sheetName.slice(0, 31) || "Sheet1")

  // คัดลอกความกว้างคอลัมน์
  const usedCols = Math.min(srcWs.columnCount || 1, MAX_COLS)
  for (let c = 1; c <= usedCols; c++) {
    ws.getColumn(c).width = srcWs.getColumn(c).width || 12
  }

  // คัดลอกค่า (แปลงสูตร -> ค่านิ่ง) + สไตล์พื้นฐาน
  const rowCount = Math.min(srcWs.rowCount || 0, MAX_ROWS)
  for (let r = 1; r <= rowCount; r++) {
    const srcRow = srcWs.getRow(r)
    const outRow = ws.getRow(r)
    for (let c = 1; c <= usedCols; c++) {
      const sc = srcRow.getCell(c)
      const oc = outRow.getCell(c)
      const t = cellText(sc)
      if (isNumericValue(sc)) {
        const num = Number(t.replace(/,/g, ""))
        oc.value = isNaN(num) ? t : num
      } else {
        oc.value = t === "" ? null : t
      }
      if (sc.font) oc.font = { ...sc.font }
      if (sc.alignment) oc.alignment = { ...sc.alignment }
      if (sc.border) oc.border = { ...sc.border }
      if (sc.fill) oc.fill = { ...sc.fill } as ExcelJS.Fill
    }
    outRow.commit?.()
  }

  // คัดลอก merges
  const rawMerges = (srcWs.model?.merges || []) as string[]
  for (const range of rawMerges) {
    try { ws.mergeCells(range) } catch { /* ข้าม merge ที่ผิดพลาด */ }
  }

  const arr = await out.xlsx.writeBuffer()
  return Buffer.from(arr)
}

/** ตรวจว่า sheet นี้เป็นใบจ่ายรถของคนขับหรือไม่ (มีหัวตาราง วันที่/ราคา/รวม) */
export function looksLikeDriverSheet(ws: ExcelJS.Worksheet): boolean {
  const keys = new Set<string>()
  const maxR = Math.min(ws.rowCount || 0, 6)
  for (let r = 1; r <= maxR; r++) {
    const row = ws.getRow(r)
    for (let c = 1; c <= Math.min(ws.columnCount || 0, 16); c++) {
      const t = cellText(row.getCell(c)).trim()
      if (t) keys.add(t)
    }
  }
  const hasDate = keys.has("วันที่")
  const hasMoney = keys.has("รวม") || keys.has("ราคา") || keys.has("ค่าขึ้นชั้น")
  return hasDate && hasMoney
}

/** เดายอดรวมจากคอลัมน์ "รวม/คงเหลือ/ยอดโอน" หรือแถว SUM ท้ายตาราง */
export function guessTotal(grid: PayslipGrid): number | null {
  // หาแถวที่มีตัวเลขมากสุดในคอลัมน์สุดท้ายที่มีค่า
  let best: number | null = null
  for (const row of grid.rows) {
    for (const cell of row) {
      if (cell.n) {
        const num = Number(cell.t.replace(/,/g, ""))
        if (!isNaN(num)) best = num // เอาค่าตัวเลขสุดท้าย (มักเป็นยอดรวมท้ายตาราง)
      }
    }
  }
  return best
}
