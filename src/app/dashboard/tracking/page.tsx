import { getActiveJobs } from "@/lib/actions/tracking-actions"
import { TrackingHubClient } from "@/components/tracking/tracking-hub-client"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function CustomerTrackingPage() {
  const activeJobs = await getActiveJobs(true) // Customer mode true

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
        <TrackingHubClient initialActiveJobs={activeJobs} customerMode={true} />
      </Suspense>
    </div>
  )
}
