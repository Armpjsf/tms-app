/**
 * แหล่งกลางเดียวของ "กลุ่มสถานะงาน" (Job Status)
 * ------------------------------------------------------------------
 * ปัญหาเดิม: ~22 ไฟล์ hardcode array สถานะเอง (เช่น ['Completed','Complete','Delivered'])
 * ไฟล์ไหนลืมใส่ synonym ตัวใดตัวหนึ่ง = นับ/กรองพลาด และแก้ยากเพราะกระจาย
 *
 * ไฟล์นี้รวม synonym cluster ไว้ที่เดียว + helper สำหรับ normalize
 * เป็น "แหล่งความจริงเดียว" ให้ไฟล์อื่น import แทนการ hardcode
 *
 * สำคัญ: ค่าในกลุ่มด้านล่าง "ตรงกับที่โค้ดเดิมใช้อยู่เป๊ะ" — เป็น refactor
 * แบบไม่เปลี่ยนพฤติกรรม ไม่แตะค่าที่เขียนลง DB หรือ transition machine
 */

// ชุด synonym ที่ระบบมีจริง (อ้างอิง job-status-machine.ts)
export const PENDING_STATUSES = ['Draft', 'Requested', 'New', 'Pending'] as const
export const ASSIGNED_STATUSES = ['Assigned', 'Confirmed', 'Accepted'] as const
export const IN_TRANSIT_STATUSES = [
  'Picked Up', 'En Route', 'En-Route', 'In Transit', 'In Progress',
  'Arrived', 'Arrived Pickup', 'Arrived Dropoff',
] as const
export const COMPLETED_STATUSES = ['Completed', 'Complete', 'Delivered'] as const
export const SETTLED_STATUSES = ['Verified', 'Billed', 'Paid'] as const
export const CANCELLED_STATUSES = ['Cancelled', 'Failed'] as const
export const EXCEPTION_STATUSES = ['SOS', 'Rejected'] as const

// สถานะสิ้นสุด (ไม่ไปต่อ)
export const TERMINAL_STATUSES = ['Paid', 'Cancelled'] as const

// สถานะที่ถือว่า "งานยังวิ่งอยู่" (สำหรับติดตาม/มอนิเตอร์)
export const ACTIVE_STATUSES = [
  ...ASSIGNED_STATUSES,
  ...IN_TRANSIT_STATUSES,
] as const

// ---- canonical bucket (ใช้ตอนต้องยุบ synonym ให้เหลือค่าเดียวสำหรับ analytics) ----
export type CanonicalStatus =
  | 'Pending'
  | 'Assigned'
  | 'In Transit'
  | 'Completed'
  | 'Verified'
  | 'Billed'
  | 'Paid'
  | 'Cancelled'
  | 'SOS'
  | 'Rejected'
  | 'Unknown'

const has = (arr: readonly string[], v: string) => arr.includes(v)

/**
 * ยุบ synonym → canonical bucket เดียว (สำหรับ analytics/รายงาน/กราฟ)
 * ค่าที่ไม่รู้จักคืน 'Unknown' (ไม่เดา)
 */
export function normalizeJobStatus(raw: string | null | undefined): CanonicalStatus {
  const s = String(raw ?? '').trim()
  if (!s) return 'Unknown'
  if (s === 'Paid') return 'Paid'
  if (s === 'Billed') return 'Billed'
  if (s === 'Verified') return 'Verified'
  if (s === 'SOS') return 'SOS'
  if (s === 'Rejected') return 'Rejected'
  if (has(COMPLETED_STATUSES, s)) return 'Completed'
  if (has(IN_TRANSIT_STATUSES, s)) return 'In Transit'
  if (has(ASSIGNED_STATUSES, s)) return 'Assigned'
  if (has(PENDING_STATUSES, s)) return 'Pending'
  if (s === 'Cancelled' || s === 'Failed') return 'Cancelled'
  return 'Unknown'
}

// ---- predicates (อ่านง่าย ใช้แทนการเทียบ array เอง) ----
export const isPending = (s: string | null | undefined) => has(PENDING_STATUSES, String(s ?? '').trim())
export const isAssigned = (s: string | null | undefined) => has(ASSIGNED_STATUSES, String(s ?? '').trim())
export const isInTransit = (s: string | null | undefined) => has(IN_TRANSIT_STATUSES, String(s ?? '').trim())
export const isCompleted = (s: string | null | undefined) => has(COMPLETED_STATUSES, String(s ?? '').trim())
export const isCancelled = (s: string | null | undefined) => has(CANCELLED_STATUSES, String(s ?? '').trim())
export const isActive = (s: string | null | undefined) => has(ACTIVE_STATUSES, String(s ?? '').trim())
export const isTerminal = (s: string | null | undefined) => has(TERMINAL_STATUSES, String(s ?? '').trim())
