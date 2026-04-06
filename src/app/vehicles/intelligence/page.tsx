
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FleetIntelligenceClient } from "./intelligence-client"
import { getActiveFleetAlerts } from "@/lib/actions/fleet-intelligence-actions"

export const dynamic = 'force-dynamic'

export default async function FleetIntelligencePage() {
    const alerts = await getActiveFleetAlerts()

    return (
        <DashboardLayout>
            <FleetIntelligenceClient initialAlerts={alerts} />
        </DashboardLayout>
    )
}
