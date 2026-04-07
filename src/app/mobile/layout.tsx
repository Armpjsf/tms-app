import { BottomNav } from "@/components/mobile/bottom-nav"
import { LocationTracker } from "@/components/mobile/location-tracker"
import { PermissionRequester } from "@/components/mobile/permission-requester"
import { getDriverSession } from "@/lib/actions/auth-actions"
import { SyncManager } from "@/components/mobile/sync-manager"
import { SessionStabilizer } from "@/components/mobile/session-stabilizer"

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getDriverSession()
  
  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground pb-32">
      <SyncManager />
      <SessionStabilizer session={session} />
      {session && <LocationTracker driverId={session.driverId} branchId={session.branchId} />}
      {session && <PermissionRequester driverId={session.driverId} />}
      <main className="flex-1">{children}</main>
      {session && <BottomNav />}
    </div>
  )
}
