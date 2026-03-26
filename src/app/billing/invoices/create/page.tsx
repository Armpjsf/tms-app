
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InvoiceForm } from "@/components/billing/invoice-form"
import { getAllCustomers } from "@/lib/supabase/customers"
import { ArrowLeft } from "lucide-react"

export default async function CreateInvoicePage() {
  const { data: customers } = await getAllCustomers()

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/billing/invoices" className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 transition-colors mb-3 text-xl font-bold">
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">ออกใบกำกับภาษี (Create Tax Invoice)</h1>
        <p className="text-muted-foreground">เลือกลูกค้าและรายการงานเพื่อสร้างใบกำกับภาษี</p>
      </div>
      
      <InvoiceForm customers={customers} />
    </DashboardLayout>
  )
}

