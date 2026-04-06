
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FleetStandardsClient } from "./fleet-standards-client"
import { getFuelStandards, getMaintenanceStandards } from "@/lib/actions/fleet-intelligence-actions"
import { getVehicleTypes } from "@/lib/actions/vehicle-type-actions"

export const dynamic = 'force-dynamic'

export default async function FleetStandardsPage() {
    const fuelStandards = await getFuelStandards()
    const maintenanceStandards = await getMaintenanceStandards()
    const vehicleTypes = await getVehicleTypes()

    return (
        <DashboardLayout>
            <FleetStandardsClient 
                initialFuel={fuelStandards} 
                initialMaintenance={maintenanceStandards} 
                masterVehicleTypes={vehicleTypes}
            />
        </DashboardLayout>
    )
}
