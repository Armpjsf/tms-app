import { getDriverSession } from "@/lib/actions/auth-actions"
import { getDriverById } from "@/lib/supabase/drivers"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MobileMaintenanceForm } from "@/components/mobile/maintenance-form"

export default async function MobileMaintenancePage() {
  const session = await getDriverSession()
  if (!session) redirect('/mobile/login')

  const driver = await getDriverById(session.driverId)

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="แจ้งซ่อมบำรุง" showBack />
      <MobileMaintenanceForm 
        driverId={session.driverId} 
        driverName={session.driverName}
        defaultVehiclePlate={driver?.Vehicle_Plate || ""} 
      />
    </div>
  )
}
