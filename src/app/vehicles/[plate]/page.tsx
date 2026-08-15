export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getVehicleForHub } from "@/app/vehicles/fleet-log-actions"
import { VehicleHubClient } from "@/components/vehicles/vehicle-hub-client"
import type { Vehicle } from "@/lib/supabase/vehicles"
import { notFound } from "next/navigation"

export default async function VehicleHubPage({ params }: { params: Promise<{ plate: string }> }) {
    const { plate: raw } = await params
    const plate = decodeURIComponent(raw)
    const vehicle = await getVehicleForHub(plate)
    if (!vehicle) notFound()

    return (
        <DashboardLayout>
            <VehicleHubClient vehicle={vehicle as unknown as Vehicle} />
        </DashboardLayout>
    )
}
