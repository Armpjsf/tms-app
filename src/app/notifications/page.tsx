export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getAdminAlerts } from "@/lib/supabase/admin-notifications"
import { NotificationsClient } from "./notifications-client"

export default async function AdminNotificationsPage() {
  const alerts = await getAdminAlerts()

  return (
    <DashboardLayout>
       <NotificationsClient alerts={alerts} />
    </DashboardLayout>
  )
}
