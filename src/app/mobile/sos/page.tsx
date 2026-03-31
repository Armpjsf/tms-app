import { getDriverSession } from "@/lib/actions/auth-actions"
import { SOSPageClient } from "./sos-client"
import { redirect } from "next/navigation"
import { getDriverById } from "@/lib/supabase/drivers"

export default async function MobileSOSPage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  const driver = await getDriverById(session.driverId)

  return (
    <SOSPageClient
      driverId={session.driverId}
      driverName={session.driverName || "คนขับ"}
      driverPhone={driver?.Mobile_No || ""}
      branchId={session.branchId || ""}
    />
  )
}
