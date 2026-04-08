import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { DashboardContent } from "./dashboard-content"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ 
    branch?: string; 
    start?: string; 
    end?: string;
  }>
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    }>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  )
}
