import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function AnalyticsLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
