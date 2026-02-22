import { BottomNav } from "@/components/mobile/bottom-nav"
import { LocationTracker } from "@/components/mobile/location-tracker"
import { PermissionRequester } from "@/components/mobile/permission-requester"
import { getDriverSession } from "@/lib/actions/auth-actions"
import { SyncManager } from "@/components/mobile/sync-manager"

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getDriverSession()
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-16">
      <SyncManager />
      <LocationTracker driverId={session?.driverId} />
      <PermissionRequester />
      <main className="flex-1">{children}</main>
      {session && <BottomNav />}
    </div>
  )
}
