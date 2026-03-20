import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getAllRepairTickets, getRepairTicketStats } from "@/lib/supabase/maintenance"
import { getAllDrivers } from "@/lib/supabase/drivers"
import { getAllVehicles } from "@/lib/supabase/vehicles"
import { getMaintenanceSchedule } from "@/lib/supabase/maintenance-schedule"
import { MaintenanceClient } from "./maintenance-client"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MaintenancePage(props: Props) {
  const searchParams = await props.searchParams
  const page = Number(searchParams.page) || 1
  const query = (searchParams.q as string) || ''
  const limit = 20
  
  const startDate = (searchParams.startDate as string) || ''
  const endDate = (searchParams.endDate as string) || ''
  const status = (searchParams.status as string) || ''

  const [{ data: tickets, count }, stats, drivers, vehicles, schedule] = await Promise.all([
    getAllRepairTickets(page, limit, query, startDate, endDate, status),
    getRepairTicketStats(),
    getAllDrivers(),
    getAllVehicles(),
    getMaintenanceSchedule(),
  ])

  return (
    <DashboardLayout>
      <MaintenanceClient 
          tickets={tickets}
          count={count}
          stats={stats}
          drivers={drivers.data}
          vehicles={vehicles.data}
          schedule={schedule}
          limit={limit}
          startDate={startDate}
          endDate={endDate}
          status={status}
      />
    </DashboardLayout>
  )
}
