export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getAllSOSAlerts, getSOSCount } from "@/lib/supabase/sos"
import SOSClientPage from "./sos-client"

export default async function SOSPage() {
  const [alerts, activeCount] = await Promise.all([
    getAllSOSAlerts(),
    getSOSCount(),
  ])

  return (
    <DashboardLayout>
       <SOSClientPage 
          alerts={alerts} 
          activeCount={activeCount} 
       />
    </DashboardLayout>
  )
}
