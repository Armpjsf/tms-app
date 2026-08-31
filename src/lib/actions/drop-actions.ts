"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

type Dest = { name?: string; so_no?: string; lat?: number; lng?: number } & Record<string, unknown>

/**
 * จัดลำดับจุดส่งใหม่สำหรับงานหลายดรอป (multi-drop)
 *
 * กลไกทั้งระบบ (pod-actions, JobWorkflow, weather badge, การปิดงาน) อ้าง
 * "จุดปัจจุบัน = original_destinations_json[completedDrops]" โดย completedDrops
 * นับจากจำนวนลายเซ็นใน Signature_Url — เราจึงจัดลำดับด้วยการเขียนทับ
 * original_destinations_json ให้เรียงตามลำดับใหม่ โดย "ล็อกส่วนหน้า" (จุดที่ส่ง
 * ไปแล้ว) ไว้ตำแหน่งเดิม แล้วสลับได้เฉพาะส่วนท้ายที่ยังไม่ส่ง เพื่อไม่ให้
 * ลายเซ็น/รูป POD ที่ผูกไว้กับ index เดิมเพี้ยนจุด
 *
 * newOrder = อาเรย์ของ index เดิม (0-based) เรียงตามลำดับใหม่ทั้งชุด
 * expectedCompleted = จำนวนดรอปที่ส่งแล้วตอนที่ client เรนเดอร์ (optimistic guard)
 */
export async function reorderDrops(
    jobId: string,
    newOrder: number[],
    expectedCompleted: number
): Promise<{ success: boolean; message?: string }> {
    jobId = decodeURIComponent(jobId)
    const supabase = createAdminClient()

    const { data: job, error } = await supabase
        .from('Jobs_Main')
        .select('Job_ID, original_destinations_json, Signature_Url')
        .eq('Job_ID', jobId)
        .single()

    if (error || !job) {
        return { success: false, message: 'ไม่พบงานนี้' }
    }

    let dests: Dest[] = []
    try {
        const raw = job.original_destinations_json
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        dests = Array.isArray(parsed) ? parsed : []
    } catch {
        dests = []
    }

    if (dests.length < 2) {
        return { success: false, message: 'งานนี้มีจุดส่งเดียว ไม่ต้องจัดลำดับ' }
    }

    // จุดที่ส่งแล้ว = จำนวนลายเซ็น (0-based prefix ที่ต้องล็อก)
    const completedDrops = job.Signature_Url
        ? job.Signature_Url.split(',').filter(Boolean).length
        : 0

    // Optimistic guard: ถ้ามี POD ปิดแทรกระหว่างที่ client กำลังจัดลำดับ
    // จำนวนที่ส่งแล้วจะไม่ตรง → ลำดับที่ส่งมา stale ให้ปฏิเสธและรีเฟรช
    if (completedDrops !== expectedCompleted) {
        return { success: false, message: 'มีการอัปเดตงานนี้ระหว่างจัดลำดับ กรุณาลองใหม่' }
    }

    // ตรวจว่า newOrder เป็น permutation ของ [0..n-1] ครบถ้วน
    if (newOrder.length !== dests.length) {
        return { success: false, message: 'ข้อมูลลำดับไม่ครบ กรุณาลองใหม่' }
    }
    const seen = new Set<number>()
    for (const idx of newOrder) {
        if (!Number.isInteger(idx) || idx < 0 || idx >= dests.length || seen.has(idx)) {
            return { success: false, message: 'ข้อมูลลำดับไม่ถูกต้อง' }
        }
        seen.add(idx)
    }

    // ล็อกส่วนหน้า: จุดที่ส่งแล้วต้องอยู่ตำแหน่งเดิม (i < completedDrops → newOrder[i] === i)
    for (let i = 0; i < completedDrops; i++) {
        if (newOrder[i] !== i) {
            return { success: false, message: 'ไม่สามารถย้ายจุดที่ส่งแล้วได้' }
        }
    }

    const reordered = newOrder.map(i => dests[i])

    const { error: updErr } = await supabase
        .from('Jobs_Main')
        .update({ original_destinations_json: JSON.stringify(reordered) })
        .eq('Job_ID', jobId)

    if (updErr) {
        return { success: false, message: 'บันทึกลำดับไม่สำเร็จ กรุณาลองใหม่' }
    }

    revalidatePath(`/mobile/jobs/${jobId}`)
    revalidatePath(`/admin/jobs/${jobId}`)
    return { success: true }
}
