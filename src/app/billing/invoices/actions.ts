
"use server"

import { createInvoice as createInvoiceLib, getInvoiceById as getInvoiceByIdLib, getInvoices as getInvoicesLib } from "@/lib/supabase/invoices"
import { getBillableJobs as getBillableJobsLib } from "@/lib/supabase/jobs"

// Wrapper for Server Actions
export async function createInvoiceAction(invoice: any) {
  return await createInvoiceLib(invoice)
}

export async function getBillableJobsAction(customerId: string) {
  return await getBillableJobsLib(customerId)
}
