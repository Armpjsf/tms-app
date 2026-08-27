export const dynamic = 'force-dynamic'
export const revalidate = 0

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getAllFuelLogs } from "@/lib/supabase/fuel"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { getFuelAnalytics } from "@/lib/supabase/fuel-analytics"
import { getFuelIntelligenceAnalytics } from "@/lib/fuel/fuel-allocation-engine"
import { FuelClient } from "./fuel-client"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FuelPage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const startDate = (searchParams.startDate as string) || ''
  const endDate = (searchParams.endDate as string) || ''
  const vehiclesParam = searchParams.vehicles
  const selectedVehicles = typeof vehiclesParam === 'string'
    ? vehiclesParam.split(',').filter(Boolean)
    : (Array.isArray(vehiclesParam) ? (vehiclesParam as string[]) : undefined)
  const limit = 20

  const [{ data: logs, count }, drivers, vehicles, analytics, intelligence] = await Promise.all([
    getAllFuelLogs(page, limit, query, startDate, endDate, selectedVehicles),
    getAllDrivers(),
    getAllVehicles(),
    getFuelAnalytics(startDate || undefined, endDate || undefined),
    getFuelIntelligenceAnalytics(startDate || undefined, endDate || undefined, selectedVehicles)
  ])

  return (
    <DashboardLayout>
      <FuelClient 
          logs={logs}
          count={count}
          drivers={drivers.data}
          vehicles={vehicles.data}
          analytics={analytics}
          intelligence={intelligence}
          limit={limit}
          startDate={startDate}
          endDate={endDate}
          selectedVehicles={selectedVehicles}
      />
    </DashboardLayout>
  )
}
