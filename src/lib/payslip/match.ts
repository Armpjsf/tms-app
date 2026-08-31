// ยูทิลิตี้ (ไม่ใช่ server action) สำหรับจับคู่ชื่อ sheet -> คนขับ และแยกชื่อไฟล์

export interface DriverLite { id: string; name: string; branch?: string | null }

function norm(s: string): string {
  return (s || "").replace(/\s+/g, "").replace(/[().]/g, "").trim().toLowerCase()
}

/** เดา Driver_ID จากชื่อ sheet (ชื่อ tab = ชื่อคนขับ) */
export function suggestDriverId(sheetName: string, drivers: DriverLite[]): string | null {
  const s = norm(sheetName)
  if (!s) return null
  // 1) ตรงเป๊ะ
  for (const d of drivers) if (norm(d.name) === s) return d.id
  // 2) ชื่อคนขับขึ้นต้นด้วยชื่อ sheet (sheet มักเป็นชื่อจริงคำแรก)
  for (const d of drivers) {
    const dn = norm(d.name)
    if (dn.startsWith(s) || s.startsWith(dn)) return d.id
  }
  // 3) มีชื่อ sheet เป็นส่วนหนึ่งของชื่อคนขับ
  for (const d of drivers) {
    if (norm(d.name).includes(s)) return d.id
  }
  return null
}

/** แยกชื่อไฟล์ "รถร่วม_1-15.7.69_มหาชัย.xlsx" -> {prefix, period, branch, title} */
export function parseFileName(fileName: string): {
  prefix: string; period: string; branch: string; title: string
} {
  const base = fileName.replace(/\.(xlsx|xlsm|xls)$/i, "")
  const parts = base.split(/[_\-\s]+/).filter(Boolean)
  let period = ""
  let branch = ""
  const others: string[] = []
  for (const p of parts) {
    if (!period && /\d/.test(p)) period = p
    else others.push(p)
  }
  const prefix = others[0] || base
  branch = others.length > 1 ? others[others.length - 1] : ""
  const title = [prefix, period, branch ? `(${branch})` : ""].filter(Boolean).join(" ")
  return { prefix, period, branch, title: title || base }
}
