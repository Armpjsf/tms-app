import { getDriverSession } from "@/lib/actions/auth-actions"
import { getDriverById } from "@/lib/supabase/drivers"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MobileFuelForm } from "@/components/mobile/fuel-form"

export default async function MobileFuelPage() {
  const session = await getDriverSession()
  if (!session) redirect('/login')

  const driver = await getDriverById(session.driverId)

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="แจ้งเติมน้ำมัน" showBack />
      <MobileFuelForm 
        driverId={session.driverId} 
        driverName={session.driverName}
        defaultVehiclePlate={driver?.Vehicle_Plate || ""} 
      />
    </div>
  )
}
