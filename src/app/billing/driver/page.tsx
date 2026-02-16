import { getJobsForBilling } from "@/lib/supabase/jobs"
import { getActiveDrivers } from "@/lib/supabase/drivers"
import { getCompanyProfile } from "@/lib/supabase/settings"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import DriverPaymentClient from "./client-page"

export const dynamic = 'force-dynamic'

export default async function DriverPaymentPage() {
  const [jobs, drivers, companyProfile, subcontractors] = await Promise.all([
    getJobsForBilling(),
    getActiveDrivers(),
    getCompanyProfile(),
    getAllSubcontractors()
  ])

  return (
    <DriverPaymentClient 
      initialJobs={jobs} 
      drivers={drivers} 
      companyProfile={companyProfile} 
      subcontractors={subcontractors}
    />
  )
}
