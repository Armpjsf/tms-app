"use server"

import { createAdminClient } from '@/utils/supabase/server'

/**
 * Pending AI write-actions for the LINE bot.
 *
 * LINE is stateless per message, so when the assistant wants to run a write
 * action we stash it here keyed by the LINE user id, reply with a confirm
 * button, and execute only after the admin taps "ยืนยัน" (which pops it back).
 *
 * Requires table `ai_pending_actions` (see supabase/schema-ai-pending.sql).
 * Rows older than TTL_MINUTES are treated as expired.
 */
const TTL_MINUTES = 10

export type PendingAction = { name: string; args: Record<string, unknown> }

export async function savePendingAction(
  userKey: string,
  name: string,
  args: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('ai_pending_actions').upsert({
    user_key: userKey,
    action_name: name,
    args,
    created_at: new Date().toISOString(),
  })
}

/** Fetch + delete the pending action for a user. Returns null if none/expired. */
export async function popPendingAction(userKey: string): Promise<PendingAction | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ai_pending_actions')
    .select('action_name, args, created_at')
    .eq('user_key', userKey)
    .maybeSingle()

  // Always clear the row so a stale action can't fire twice.
  await supabase.from('ai_pending_actions').delete().eq('user_key', userKey)

  if (!data) return null
  const ageMs = Date.now() - new Date(data.created_at).getTime()
  if (ageMs > TTL_MINUTES * 60 * 1000) return null

  return { name: data.action_name, args: (data.args || {}) as Record<string, unknown> }
}
