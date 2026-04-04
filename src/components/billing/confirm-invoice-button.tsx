"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Loader2 } from "lucide-react"
import { confirmInvoiceAndCreateBillingNote } from "@/lib/actions/billing-flow-actions"
import { toast } from "sonner"

interface ConfirmInvoiceButtonProps {
    invoiceId: string
    status: string
    label?: string
}

export function ConfirmInvoiceButton({ invoiceId, status, label }: ConfirmInvoiceButtonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    if (status !== 'Draft') return null

    const handleConfirm = async () => {
        if (!confirm("ยืนยันความถูกต้องของใบแจ้งหนี้เพื่อออกใบวางบิลชุดจริง (PDF)?\nการดำเนินการนี้จะสร้างเลขที่ใบวางบิลใหม่และล็อคข้อมูลทันที")) return

        setLoading(true)
        try {
            const result = await confirmInvoiceAndCreateBillingNote(invoiceId)
            if (result.success) {
                toast.success("ยืนยันความถูกต้องสำเร็จ! ระบบสร้างใบวางบิลชุดจริงเรียบร้อยแล้ว")
                router.refresh()
            } else {
                toast.error(result.error || "เกิดข้อผิดพลาดในการยืนยัน")
            }
        } catch (err) {
            toast.error("Internal Error: " + String(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button 
            onClick={handleConfirm}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-500/20 px-6"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck size={18} />}
            {label || "ยืนยันความถูกต้อง & ออกใบวางบิล"}
        </Button>
    )
}
