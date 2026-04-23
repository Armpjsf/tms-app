'use client'

import { useState } from 'react'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { 
    CheckCircle, 
    Loader2, 
    FileSpreadsheet, 
    FileText, 
    Zap, 
    MoreHorizontal,
    ClipboardCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { confirmInvoicePayment } from "@/lib/supabase/invoices"
import { exportInvoiceExcel } from "@/lib/actions/invoice-excel-actions"
import { 
    confirmInvoiceAndCreateBillingNote, 
    voidAndRejectInvoice 
} from "@/lib/actions/billing-flow-actions"
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import Link from 'next/link'

interface InvoiceRowActionsProps {
  id: string
  type: 'Invoice' | 'BillingNote'
  status: string
  customerName?: string
  language?: string
}

export function InvoiceRowActions({ id, type, status, language = 'th' }: InvoiceRowActionsProps) {
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const router = useRouter()

  const handleConfirmPayment = async () => {
    setLoading(true)
    try {
      const result = await confirmInvoicePayment(id, type)
      if (result.success) {
        toast.success(language === 'th' ? 'ยืนยันการรับชำระเงินเรียบร้อยแล้ว' : 'Payment confirmed')
        router.refresh()
      } else {
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาดในการยืนยันรายการ' : 'Error confirming payment')
      }
    } catch {
      toast.error('Technical Error')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    const loadingToast = toast.loading(language === 'th' ? "กำลังเตรียมไฟล์ Excel..." : "Preparing Excel...")
    try {
        const result = await exportInvoiceExcel(id)
        if (result.success && result.data) {
            const byteCharacters = atob(result.data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.fileName || `Invoice_${id}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success(language === 'th' ? "ส่งออกสำเร็จ" : "Export success", { id: loadingToast })
        } else {
            toast.error("Error: " + result.error, { id: loadingToast })
        }
    } catch {
        toast.error("Export Error", { id: loadingToast })
    } finally {
        setExporting(false)
    }
  }

  const handleConfirmVerification = async () => {
    const confirmMsg = language === 'th' 
        ? 'ยืนยันความถูกต้องของข้อมูล? ระบบจะสร้างใบวางบิลตัวจริงและส่งข้อมูลไปยังส่วนงานบัญชี'
        : 'Confirm accuracy? System will create actual Billing Note.'
        
    if (!confirm(confirmMsg)) return
    
    setLoading(true)
    const loadingToast = toast.loading(language === 'th' ? "กำลังดำเนินการ..." : "Processing...")
    try {
        const result = await confirmInvoiceAndCreateBillingNote(id)
        if (result.success) {
            toast.success(language === 'th' ? `สร้างใบวางบิลสำเร็จ (${result.billingNoteId})` : `Success (${result.billingNoteId})`, { id: loadingToast })
            router.refresh()
        } else {
            toast.error("Error: " + result.error, { id: loadingToast })
        }
    } catch {
        toast.error("Technical Error", { id: loadingToast })
    } finally {
        setLoading(false)
    }
  }

  const handleRejectInvoice = async () => {
    const confirmMessage = language === 'th' 
        ? "คุณต้องการยกเลิกใบแจ้งหนี้นี้ใช่หรือไม่? งานทั้งหมดในใบนี้จะถูกตีกลับไปเป็นสถานะ 'รอวางบิล' เพื่อให้คุณแก้ไขและรวมยอดใหม่ได้"
        : "Are you sure you want to void this invoice? All jobs will be reset to 'Pending Billing' status for re-billing."
        
    if (!confirm(confirmMessage)) return
    
    setLoading(true)
    const loadingToast = toast.loading(language === 'th' ? "กำลังยกเลิกรายการ..." : "Voiding invoice...")
    try {
        const result = await voidAndRejectInvoice(id)
        if (result.success) {
            toast.success(language === 'th' ? "ยกเลิกใบแจ้งหนี้เรียบร้อยแล้ว งานถูกตีกลับไปสถานะรอวางบิล" : "Invoice voided successfully.", { id: loadingToast })
            router.refresh()
        } else {
            toast.error(result.error || "Failed to void", { id: loadingToast })
        }
    } catch {
        toast.error("Technical Error", { id: loadingToast })
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
        <Button 
            variant="ghost" 
            size="sm"
            disabled={exporting}
            onClick={handleExportExcel}
            className="h-10 px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl transition-all active:scale-90"
        >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-muted/80 transition-all">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border/10 min-w-[220px] p-2 rounded-2xl shadow-2xl">
                <DropdownMenuLabel className="text-xs font-black text-muted-foreground uppercase tracking-widest px-4 py-2">
                    {language === 'th' ? 'การจัดการ' : 'Management'}
                </DropdownMenuLabel>
                
                {status === 'Draft' && (
                    <DropdownMenuItem 
                        className="focus:bg-purple-500/20 focus:text-purple-400 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
                        onSelect={(e) => { e.preventDefault(); handleConfirmVerification(); }}
                    >
                        <ClipboardCheck className="h-4 w-4 text-purple-400" />
                        <span className="font-bold uppercase tracking-widest">
                            {language === 'th' ? 'ยืนยันความถูกต้อง' : 'VERIFY'}
                        </span>
                    </DropdownMenuItem>
                )}

                {status !== 'Paid' && status !== 'Draft' && (
                    <DropdownMenuItem 
                        className="focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
                        onSelect={(e) => { e.preventDefault(); handleConfirmPayment(); }}
                    >
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold uppercase tracking-widest">
                            {language === 'th' ? 'รับชำระเงิน' : 'CONFIRM PAYMENT'}
                        </span>
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem 
                    className="focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
                    onClick={handleExportExcel}
                >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold uppercase tracking-widest">EXCEL</span>
                </DropdownMenuItem>

                {status !== 'Draft' && (
                    <DropdownMenuItem className="focus:bg-primary/20 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors" asChild>
                        <Link 
                            href={`/billing/print/${id.startsWith('BN-') || id.startsWith('INV') ? id : `BN-${id}`}?lang=${language}`} 
                            target="_blank" 
                            className="flex items-center w-full"
                        >
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-bold uppercase tracking-widest">PDF</span>
                        </Link>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-muted/50 my-2 mx-2" />
                
                {status !== 'Paid' && (
                    <DropdownMenuItem 
                        className="focus:bg-rose-500/20 focus:text-rose-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
                        onSelect={(e) => { e.preventDefault(); handleRejectInvoice(); }}
                    >
                        <Zap className="h-4 w-4 text-rose-500" />
                        <span className="font-bold uppercase tracking-widest text-rose-500">
                            {language === 'th' ? 'ยกเลิกรายการ' : 'VOID INVOICE'}
                        </span>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )
}
