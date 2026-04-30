import { cookies } from "next/headers"
import { getInvoices } from "@/lib/supabase/invoices"
import { getJobsForBilling, Job } from "@/lib/supabase/jobs"
import { Language } from "@/lib/i18n/dictionaries"
import { Customer } from "@/lib/supabase/customers"
import InvoicesClient from "./invoices-client"

export const dynamic = 'force-dynamic'

interface Invoice {
  Invoice_ID: string
  Tax_Invoice_ID?: string
  Customer_Name: string
  Issue_Date?: string
  Due_Date?: string
  Grand_Total: number
  Status: string
  Type: 'Invoice' | 'BillingNote'
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>
}) {
  const resolvedParams = await searchParams
  const query = resolvedParams?.query || ""
  
  const cookieStore = await cookies()
  const selectedBranch = cookieStore.get('selectedBranch')?.value || "All"
  
  // Fetch all required data: Invoices, Billable Jobs, and Customers
  const [invoicesRes, billableJobs, { getAllCustomers }] = await Promise.all([
    getInvoices(1, 100, query),
    getJobsForBilling(undefined, undefined, undefined, 'customer'),
    import("@/lib/supabase/customers")
  ])
  const customersRes = await getAllCustomers()
  const customers = (customersRes.data || []) as Customer[]

  return (
    <InvoicesClient 
        initialInvoices={invoicesRes.data as Invoice[]} 
        billableJobs={billableJobs as Job[]}
        customers={customers}
        query={query} 
    />
  )
}
