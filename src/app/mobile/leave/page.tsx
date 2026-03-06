import { getDriverSession } from "@/lib/actions/auth-actions"
import { redirect } from "next/navigation"
import { getMyLeaves } from "@/lib/supabase/driver-leaves"
import { MobileLeaveClient } from "./leave-client"

export const dynamic = 'force-dynamic'

export default async function MobileLeavePage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const leaves = await getMyLeaves(session.driverId)

  return (
    <MobileLeaveClient 
      driverId={session.driverId}
      driverName={session.name || session.driverId}
      initialLeaves={leaves}
    />
  )
}
