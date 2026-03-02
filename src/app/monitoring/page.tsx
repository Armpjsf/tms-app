export const dynamic = 'force-dynamic'

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { getJobsByStatus } from '@/lib/supabase/jobs'
import { getFleetGPSStatus } from '@/lib/supabase/gps'
import { getChatContacts } from '@/lib/supabase/chat'
import { getFleetHealthAlerts } from '@/lib/supabase/fleet-health'
import { MonitoringCommandCenter } from '@/components/monitoring/monitoring-command-center'
import { getCustomerId, isCustomer } from '@/lib/permissions'

export default async function MonitoringPage() {
  const [customerMode, customerId] = await Promise.all([
      isCustomer(),
      getCustomerId()
  ])

  const [assignedJobs, confirmedJobs, inProgressJobs, inTransitJobs, arrivedJobs, sosJobs, failedJobs, activeDrivers, chatContacts, healthAlerts] = await Promise.all([
    getJobsByStatus('Assigned'),
    getJobsByStatus('Confirmed'),
    getJobsByStatus('In Progress'),
    getJobsByStatus('In Transit'),
    getJobsByStatus('Arrived'),
    getJobsByStatus('SOS'),
    getJobsByStatus('Failed'),
    getFleetGPSStatus(customerId),
    getChatContacts(),
    getFleetHealthAlerts(),
  ])

  const activeJobs = [...assignedJobs, ...confirmedJobs, ...inProgressJobs, ...inTransitJobs, ...arrivedJobs, ...sosJobs, ...failedJobs].sort((a, b) => 
    new Date(b.Plan_Date || '').getTime() - new Date(a.Plan_Date || '').getTime()
  )

  return (
    <DashboardLayout>
        <MonitoringCommandCenter 
            initialJobs={activeJobs} 
            initialDrivers={activeDrivers as any} 
            initialContacts={chatContacts}
            allDrivers={activeDrivers as any}
            initialHealthAlerts={healthAlerts}
        />
    </DashboardLayout>
  )
}
