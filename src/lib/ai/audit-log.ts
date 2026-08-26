"use server"

import { createAdminClient } from '@/utils/supabase/server'

/**
 * Audit log for AI/LINE write actions. Every confirmed write is recorded here
 * (who / what / args / success), and create actions also store a { table, pk }
 * reference so the most recent one can be undone.
 *
 * Requires table `ai_action_log` (see supabase/migrations/20260826_ai_action_log.sql).
 */

export type ActionRef = { table: string; pk: Record<string, unknown> }

export async function logAction(entry: {
  actor?: string
  channel?: 'chat' | 'line'
  actionName: string
  args: Record<string, unknown>
  success: boolean
  resultRef?: ActionRef | null
  message?: string
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('ai_action_log').insert({
      actor: entry.actor || null,
      channel: entry.channel || null,
      action_name: entry.actionName,
      args: entry.args,
      success: entry.success,
      result_ref: entry.resultRef || null,
      message: entry.message || null,
    })
  } catch (err) {
    // Never let logging break the actual action.
    console.warn('[audit-log] failed:', err)
  }
}

/**
 * Undo the most recent undoable (create-*) action by this actor, within the
 * last `maxAgeMinutes`. Deletes the created row and marks the log entry undone.
 */
export async function undoLastAction(
  actor: string,
  maxAgeMinutes = 30,
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ai_action_log')
    .select('id, action_name, result_ref, created_at, message')
    .eq('actor', actor)
    .eq('success', true)
    .not('result_ref', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.result_ref) {
    return { success: false, message: 'ไม่พบรายการที่ย้อนกลับได้ในช่วงนี้ครับ' }
  }
  const ageMs = Date.now() - new Date(data.created_at).getTime()
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    return { success: false, message: 'รายการล่าสุดเก่าเกินกว่าจะย้อนกลับแล้วครับ (เกิน 30 นาที)' }
  }

  const ref = data.result_ref as ActionRef
  const [pkCol, pkVal] = Object.entries(ref.pk)[0] || []
  if (!ref.table || !pkCol) {
    return { success: false, message: 'ข้อมูลอ้างอิงไม่ครบ ย้อนกลับไม่ได้ครับ' }
  }

  const { error } = await supabase.from(ref.table).delete().eq(pkCol, pkVal as string)
  if (error) return { success: false, message: `ย้อนกลับไม่สำเร็จ: ${error.message}` }

  // Mark the original entry as undone so it can't be undone twice.
  await supabase.from('ai_action_log').update({ result_ref: null, message: `${data.message || ''} [undone]` }).eq('id', data.id)

  return { success: true, message: `↩️ ย้อนกลับแล้ว: ลบ ${ref.table} (${pkVal}) ที่เพิ่งสร้างเรียบร้อยครับ` }
}
