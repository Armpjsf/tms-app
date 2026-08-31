// Type-only (import ได้ทั้ง client/server โดยไม่ลาก exceljs)

export interface PayslipCell {
  t: string            // ข้อความที่แสดง
  b?: boolean          // ตัวหนา
  a?: "left" | "center" | "right"
  n?: boolean          // เป็นตัวเลข (จัดชิดขวา)
}
export interface PayslipMerge { r: number; c: number; rs: number; cs: number } // 0-based, rowspan/colspan
export interface PayslipGrid {
  cols: number[]                 // ความกว้างคอลัมน์
  merges: PayslipMerge[]
  rows: PayslipCell[][]
  maxCols: number
}
