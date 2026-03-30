import { getDriverSession } from "@/lib/actions/auth-actions"
import { SOSPageClient } from "./sos-client"
import { redirect } from "next/navigation"

export default async function MobileSOSPage() {
  const session = await getDriverSession()
  if (!session) redirect("/mobile/login")

  return (
    <SOSPageClient
      driverId={session.driverId}
      driverName={session.driverName || "คนขับ"}
    />
  )
}
