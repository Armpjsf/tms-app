import { getJobsForBilling } from "@/lib/supabase/jobs"
import CustomerBillingClient from "./client-page"

export const dynamic = 'force-dynamic'

export default async function CustomerBillingPage() {
  const jobs = await getJobsForBilling()

  return <CustomerBillingClient initialJobs={jobs} />
}
