import { getDriverPendingCounts } from "@/lib/supabase/jobs"
import { getActiveDrivers } from "@/lib/supabase/drivers"
import { getCompanyProfile } from "@/lib/supabase/settings"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import DriverPaymentClient from "./client-page"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function DriverPaymentPage({ searchParams }: PageProps) {
  const params = await searchParams
  const dateFrom = params.dateFrom || undefined
  const dateTo = params.dateTo || undefined

  // ส่งแค่ "ยอดงานค้างต่อคนขับ" (payload เล็ก) แทนงานทั้งพัน
  // งานจริงของแต่ละคนขับโหลดตอนเลือก (client เรียก getJobsForBilling ต่อคน)
  const [pendingCounts, drivers, companyProfile, subcontractors] = await Promise.all([
    getDriverPendingCounts(dateFrom, dateTo),
    getActiveDrivers(),
    getCompanyProfile(),
    getAllSubcontractors()
  ])

  return (
    <DriverPaymentClient
      initialCounts={pendingCounts}
      drivers={drivers}
      companyProfile={companyProfile}
      subcontractors={subcontractors}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
    />
  )
}
