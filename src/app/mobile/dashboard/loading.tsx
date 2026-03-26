import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="relative min-h-screen bg-transparent pb-24 pt-16 px-4">
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-2xl bg-muted/50" />
            <Skeleton className="w-32 h-8 bg-muted/50" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl bg-muted/50" />
            <Skeleton className="w-11 h-11 rounded-full bg-muted/50" />
          </div>
        </div>

        {/* Title Skeleton */}
        <div className="space-y-2">
          <Skeleton className="w-48 h-10 bg-muted/50" />
          <Skeleton className="w-64 h-5 bg-muted/50" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-[2.5rem] bg-muted/50" />
          <Skeleton className="aspect-square rounded-[2.5rem] bg-muted/50" />
        </div>

        {/* Job Card Skeleton */}
        <Skeleton className="h-64 w-full rounded-[3rem] bg-muted/50" />
      </div>
    </div>
  )
}
