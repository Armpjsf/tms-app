import { DashboardLayout } from "@/components/layout/dashboard-layout"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: DashboardLayoutProps) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
