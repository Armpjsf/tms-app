import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { NotificationsContent } from "@/components/mobile/notifications-content"
import { getDriverNotifications } from "@/lib/actions/notification-actions"

export const dynamic = 'force-dynamic'

export default async function MobileNotificationsPage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const notifications = await getDriverNotifications(session.driverId)

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="การแจ้งเตือน" showBack />
      <NotificationsContent 
        notifications={notifications} 
        driverId={session.driverId}
      />
    </div>
  )
}
