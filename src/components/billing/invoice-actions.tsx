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
    Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { confirmInvoicePayment } from "@/lib/supabase/invoices"
import { exportInvoiceExcel } from "@/lib/actions/invoice-excel-actions"
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

  const handleExportExcel = async () => {
    setExporting(true)
    const loadingToast = toast.loading("กำลังเตรียมไฟล์ Excel (ใบแจ้งหนี้)...")
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
            toast.success("ส่งออกไฟล์ Excel สำเร็จ", { id: loadingToast })
        } else {
            toast.error("ส่งออกไม่สำเร็จ: " + result.error, { id: loadingToast })
        }
    } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการส่งออก", { id: loadingToast })
    } finally {
        setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
        {/* Quick Export Button */}
        <Button 
            variant="ghost" 
            size="sm"
            disabled={exporting}
            onClick={handleExportExcel}
            className="h-10 px-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl transition-all active:scale-90"
            title="ส่งออก Excel (ใบแจ้งหนี้)"
        >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border/10 text-foreground min-w-[220px] p-2 rounded-2xl shadow-2xl ring-1 ring-white/10">
                <DropdownMenuLabel className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest px-4 py-3">การจัดการ</DropdownMenuLabel>
                
                {status !== 'Paid' && (
                    <DropdownMenuItem 
                        className="focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
                        onSelect={(e) => { e.preventDefault(); handleConfirmPayment(); }}
                    >
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-base font-bold font-black uppercase tracking-widest">รับชำระเงิน</span>
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem 
                    className="focus:bg-emerald-500/20 focus:text-emerald-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors"
                    onClick={handleExportExcel}
                >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span className="text-base font-bold font-black uppercase tracking-widest">ส่งออก EXCEL (ใบแจ้งหนี้)</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="focus:bg-primary/20 focus:text-white cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors" asChild>
                    <Link href={`/billing/print/${id}?lang=${language}`} target="_blank" className="flex items-center w-full">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-base font-bold font-black uppercase tracking-widest">พิมพ์ใบวางบิล (PDF)</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-muted/50 my-2 mx-2" />
                
                <DropdownMenuItem className="focus:bg-rose-500/20 focus:text-rose-500 cursor-pointer rounded-xl px-4 py-3 gap-3 transition-colors">
                    <Zap className="h-4 w-4" />
                    <span className="text-base font-bold font-black uppercase tracking-widest">ยกเลิกรายการ</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  )
}
