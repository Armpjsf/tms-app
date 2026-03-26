import { getDriverSession } from "@/lib/actions/auth-actions"
import { getDriverById } from "@/lib/supabase/drivers"
import { redirect } from "next/navigation"
import { MobileHeader } from "@/components/mobile/mobile-header"
import { MobileMaintenanceForm } from "@/components/mobile/maintenance-form"
import { Suspense } from "react"

export const dynamic = 'force-dynamic'

async function MaintenanceFormContent() {
  const session = await getDriverSession()
  if (!session) redirect('/mobile/login')

  const driver = await getDriverById(session.driverId)

  return (
    <div className="min-h-screen bg-background pb-24 pt-16 px-4">
      <MobileHeader title="แจ้งซ่อมบำรุง" showBack />
      <MobileMaintenanceForm 
        driverId={session.driverId} 
        driverName={session.driverName}
        defaultVehiclePlate={driver?.Vehicle_Plate || ""} 
      />
    </div>
  )
}

export default function MobileMaintenancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pt-20 px-4">
        <MobileHeader title="แจ้งซ่อมบำรุง" showBack />
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    }>
      <MaintenanceFormContent />
    </Suspense>
  )
}
