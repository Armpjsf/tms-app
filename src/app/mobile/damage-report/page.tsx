import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { getMyDamageReports } from "@/lib/supabase/damage-reports"
import { MobileDamageClient } from "./damage-client"
import { createClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'

export default async function MobileDamagePage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const reports = await getMyDamageReports(session.driverId)

  // Fetch recent active jobs for the dropdown
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('Jobs_Main')
    .select('Job_ID, Plan_Date, Customer_Name, Vehicle_Plate')
    .eq('Driver_ID', session.driverId)
    .neq('Job_Status', 'Cancelled')
    .order('Created_At', { ascending: false })
    .limit(20)

  return (
    <MobileDamageClient 
      driverId={session.driverId}
      driverName={session.name || session.driverId}
      initialReports={reports}
      recentJobs={jobs || []}
    />
  )
}
