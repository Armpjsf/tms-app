'use client'

import { useState } from 'react'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { CheckCircle, Loader2 } from "lucide-react"
import { confirmInvoicePayment } from "@/lib/supabase/invoices"
import { useRouter } from 'next/navigation'
import { toast } from "sonner"

interface InvoiceActionsProps {
  id: string
  type: 'Invoice' | 'BillingNote'
  status: string
  label: string
}

export function InvoicePaymentAction({ id, type, status, label }: InvoiceActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (status === 'Paid') return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await confirmInvoicePayment(id, type)
      if (result.success) {
        toast.success('ยืนยันการรับชำระเงินเรียบร้อยแล้ว')
        router.refresh()
      } else {
        toast.error('เกิดข้อผิดพลาดในการยืนยันรายการ')
      }
    } catch (error) {
      toast.error('ข้อผิดพลาดทางเทคนิค')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenuItem 
      className="focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
      disabled={loading}
      onSelect={(e) => {
        e.preventDefault()
        handleConfirm()
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
      <span className="text-base font-bold font-black uppercase tracking-widest">{label}</span>
    </DropdownMenuItem>
  )
}
