
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { InvoiceForm } from "@/components/billing/invoice-form"
import { getAllCustomers } from "@/lib/supabase/customers"

export default async function CreateInvoicePage() {
  const { data: customers } = await getAllCustomers()

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">ออกใบกำกับภาษี (Create Tax Invoice)</h1>
        <p className="text-slate-400">เลือกลูกค้าและรายการงานเพื่อสร้างใบกำกับภาษี</p>
      </div>
      
      <InvoiceForm customers={customers} />
    </DashboardLayout>
  )
}
