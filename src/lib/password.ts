import 'server-only'
import { argon2id, argon2Verify } from 'hash-wasm'
import { randomBytes } from 'crypto'

/**
 * Password hashing/verification via hash-wasm (pure WASM Argon2id).
 *
 * ทำไมไม่ใช้ `argon2` (native): บน Vercel/serverless ตัว native binary (.node)
 * บางครั้งถูก bundle/trace ไม่ครบ ทำให้ argon2.verify โยน error เป็นบางครั้ง
 * แล้วถูกตีความเป็น "รหัสผ่านผิด" → ผู้ใช้เข้าระบบไม่ได้เป็นระยะ.
 * WASM ไม่มีไบนารีให้โหลดพลาด จึงเสถียรทุก instance และ verify hash
 * รูปแบบ `$argon2id$...` เดิมที่สร้างโดย native argon2 ได้ตามปกติ.
 */

// พารามิเตอร์ให้ใกล้เคียง default ของ node-argon2 (argon2id)
const HASH_OPTIONS = {
  parallelism: 4,
  iterations: 3,
  memorySize: 65536, // KB = 64 MB
  hashLength: 32,
  outputType: 'encoded' as const,
}

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    ...HASH_OPTIONS,
  })
}

/**
 * ตรวจรหัสผ่าน. รองรับทั้ง hash แบบ `$argon2...` และ plain-text (legacy) เพื่อ
 * ให้ระบบ auto-migrate เดิมยังทำงานได้.
 * โยน error เฉพาะกรณี WASM/runtime พังจริง (ไม่กลืนเป็น "รหัสผิด").
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  const dbPassword = storedHash || ''
  if (dbPassword.startsWith('$argon2')) {
    return argon2Verify({ password, hash: dbPassword })
  }
  // Plain-text fallback (legacy) — ให้ผู้เรียก auto-migrate ต่อเอง
  return password === dbPassword
}

/** true ถ้าค่าที่เก็บเป็น hash argon2 อยู่แล้ว (ไม่ต้อง migrate) */
export function isHashed(storedHash: string | null | undefined): boolean {
  return !!storedHash && storedHash.startsWith('$argon2')
}
