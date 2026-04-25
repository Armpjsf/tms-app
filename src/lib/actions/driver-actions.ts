'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Update the status of a driver's leave request
 */
export async function updateLeaveStatus(leaveId: string, status: 'Approved' | 'Rejected') {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('Driver_Leaves')
        .update({ 
            Status: status,
            Updated_At: new Date().toISOString()
        })
        .eq('id', leaveId)
        .select()

    if (error) {
        console.error("Error updating leave status:", error)
        return { success: false, message: error.message }
    }

    if (data && data.length > 0) {
        const leave = data[0]
        if (leave.Driver_ID) {
            const { notifyLeaveApproval } = await import('@/lib/actions/push-actions')
            try {
                await notifyLeaveApproval(leave.Driver_ID, leave.Status, leave.Leave_Type || 'ลางาน')
            } catch (e) {
                console.error("Failed to push leave notification:", e)
            }
        }
    }

    revalidatePath('/admin/driver-leaves')
    return { success: true, data }
}
