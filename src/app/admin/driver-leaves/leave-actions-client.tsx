'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { updateLeaveStatus } from "@/lib/actions/driver-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface LeaveActionsClientProps {
    leaveId: string
}

export function LeaveActionsClient({ leaveId }: LeaveActionsClientProps) {
    const [loading, setLoading] = useState<'Approve' | 'Reject' | null>(null)

    const handleAction = async (status: 'Approved' | 'Rejected') => {
        setLoading(status === 'Approved' ? 'Approve' : 'Reject')
        try {
            const result = await updateLeaveStatus(leaveId, status)
            if (result.success) {
                toast.success(status === 'Approved' ? "อนุมัติการลาเรียบร้อยแล้ว" : "ปฏิเสธการลาเรียบร้อยแล้ว")
            } else {
                toast.error("เกิดข้อผิดพลาด: " + result.message)
            }
        } catch (error) {
            toast.error("ไม่สามารถดำเนินการได้")
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <Button 
                disabled={loading !== null}
                onClick={() => handleAction('Approved')}
                className="w-full md:w-32 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
                {loading === 'Approve' ? <Loader2 className="animate-spin" /> : 'อนุมัติ'}
            </Button>
            <Button 
                disabled={loading !== null}
                variant="outline" 
                onClick={() => handleAction('Rejected')}
                className="w-full md:w-32 h-16 rounded-2xl border-2 border-red-200 text-red-600 hover:bg-red-50 font-black uppercase tracking-widest active:scale-95 transition-all"
            >
                {loading === 'Reject' ? <Loader2 className="animate-spin" /> : 'ปฏิเสธ'}
            </Button>
        </div>
    )
}
