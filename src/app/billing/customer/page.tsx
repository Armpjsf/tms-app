import { getJobsForBilling } from "@/lib/supabase/jobs"
import { getCompanyProfile } from "@/lib/supabase/settings"
import { getAllCustomers } from "@/lib/supabase/customers"
import CustomerBillingClient from "./client-page"

export const dynamic = 'force-dynamic'

export default async function CustomerBillingPage() {
  const jobs = await getJobsForBilling()
  const companyProfile = await getCompanyProfile()
  const customers = await getAllCustomers()

  return <CustomerBillingClient initialJobs={jobs} companyProfile={companyProfile} customers={customers.data} />
}
