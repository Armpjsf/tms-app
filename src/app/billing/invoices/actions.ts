
"use server"

import { createInvoice as createInvoiceLib } from "@/lib/supabase/invoices"
import { getBillableJobs as getBillableJobsLib } from "@/lib/supabase/jobs"

// Wrapper for Server Actions
export async function createInvoiceAction(invoice: Record<string, unknown>) {
  return await createInvoiceLib(invoice)
}

export async function getBillableJobsAction(customerId?: string, startDate?: string, endDate?: string) {
  return await getBillableJobsLib(customerId, startDate, endDate)
}
