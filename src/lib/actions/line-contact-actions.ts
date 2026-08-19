"use server"

/**
 * Customer LINE Contacts — CRUD for the per-customer team recipient list.
 * Backs the "ผู้รับแจ้งเตือน LINE (ทีมลูกค้า)" section on the customer settings
 * page. Supports a LINE group (Target_Type='group') and/or individual members
 * (Target_Type='user'). Uses the admin client (server-only, bypasses RLS).
 */

import { createAdminClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/services/permission-guards"

export type LineContact = {
  id: string
  Customer_ID: string
  Line_Target_ID: string
  Target_Type: "user" | "group"
  Bot_Index: number
  Contact_Name: string | null
  Active: boolean
  created_at: string
}

export async function getCustomerLineContacts(customerId: string): Promise<LineContact[]> {
  if (!customerId) return []
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("Customer_Line_Contacts")
      .select("*")
      .eq("Customer_ID", customerId)
      .order("created_at", { ascending: true })
    if (error) return []
    return (data as LineContact[]) || []
  } catch {
    return []
  }
}

export async function addCustomerLineContact(input: {
  customerId: string
  lineTargetId: string
  targetType: "user" | "group"
  botIndex: number
  contactName?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const id = input.lineTargetId.trim()
    if (!input.customerId) return { success: false, error: "ไม่พบรหัสลูกค้า" }
    if (!id) return { success: false, error: "กรุณาระบุ LINE ID / Group ID" }
    // LINE user ids start with 'U', group ids with 'C', room ids with 'R'.
    if (!/^[UCR][0-9a-f]{32}$/i.test(id)) {
      return { success: false, error: "รูปแบบ LINE ID ไม่ถูกต้อง (ต้องขึ้นต้นด้วย U/C ตามด้วยรหัส 32 ตัว)" }
    }
    const supabase = createAdminClient()
    const { error } = await supabase.from("Customer_Line_Contacts").upsert(
      {
        Customer_ID: input.customerId,
        Line_Target_ID: id,
        Target_Type: input.targetType,
        Bot_Index: input.botIndex === 2 ? 2 : 1,
        Contact_Name: input.contactName?.trim() || null,
        Active: true,
      },
      { onConflict: "Line_Target_ID,Bot_Index" }
    )
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown error" }
  }
}

export async function setCustomerLineContactActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("Customer_Line_Contacts")
      .update({ Active: active })
      .eq("id", id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown error" }
  }
}

export async function deleteCustomerLineContact(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from("Customer_Line_Contacts").delete().eq("id", id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown error" }
  }
}
