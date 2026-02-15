import { MobileHeader } from "@/components/mobile/mobile-header"
import { getDriverSession } from "@/lib/actions/auth-actions"
import { MobileVehicleCheckForm } from "@/components/mobile/vehicle-check-form"
import { redirect } from "next/navigation"

export default async function MobileVehicleCheckPage() {
  const session = await getDriverSession()
  
  if (!session) {
    redirect("/mobile/login")
  }

  // Mock default plate - in real app fetch from driver's assigned vehicle
  const defaultPlate = "" 

  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="เช็คสภาพรถประจำวัน" showBack />
      <MobileVehicleCheckForm 
        driverId={session.driverId} 
        driverName={session.driverName}
        defaultVehiclePlate={defaultPlate}
      />
    </div>
  )
}
