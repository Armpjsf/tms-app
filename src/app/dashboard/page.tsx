import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { DashboardContent } from "./dashboard-content"
import { OverdueAlertBanner } from "@/components/dashboard/overdue-alert-banner"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    branch?: string;
    start?: string;
    end?: string;
    customer?: string;
  }>
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams

  return (
    <>
      {/* Own Suspense so the overdue check never blocks the dashboard render */}
      <Suspense fallback={null}>
        <OverdueAlertBanner customer={searchParams.customer} />
      </Suspense>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      }>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}
