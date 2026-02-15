import { getJobsForBilling } from "@/lib/supabase/jobs"
import { getActiveDrivers } from "@/lib/supabase/drivers"
import { getCompanyProfile } from "@/lib/supabase/settings"
import DriverPaymentClient from "./client-page"

export const dynamic = 'force-dynamic'

export default async function DriverPaymentPage() {
  const jobs = await getJobsForBilling()
  const drivers = await getActiveDrivers()
  const companyProfile = await getCompanyProfile()

  return <DriverPaymentClient initialJobs={jobs} drivers={drivers} companyProfile={companyProfile} />
}
