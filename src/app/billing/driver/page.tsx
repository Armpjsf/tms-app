import { getJobsForBilling } from "@/lib/supabase/jobs"
import DriverPaymentClient from "./client-page"

export const dynamic = 'force-dynamic'

export default async function DriverPaymentPage() {
  const jobs = await getJobsForBilling()

  return <DriverPaymentClient initialJobs={jobs} />
}
