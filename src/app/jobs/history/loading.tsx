import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function JobsHistoryLoading() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-48 bg-slate-800 mb-2" />
          <Skeleton className="h-4 w-64 bg-slate-800" />
        </div>
        <Skeleton className="h-10 w-32 bg-slate-800 rounded-md" />
      </div>

       {/* Filters */}
       <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-64 bg-slate-800 rounded-md" />
          <Skeleton className="h-10 w-32 bg-slate-800 rounded-md" />
       </div>

      {/* Table Skeleton */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 p-4 border-b border-slate-800 bg-slate-900/50">
                {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full bg-slate-800" />
                ))}
            </div>
            
            {/* Table Rows */}
            {[...Array(10)].map((_, i) => (
                <div key={i} className="grid grid-cols-7 gap-4 p-4 border-b border-slate-800 items-center">
                     <Skeleton className="h-4 w-20 bg-slate-800" />
                     <Skeleton className="h-4 w-32 bg-slate-800" />
                     <Skeleton className="h-4 w-24 bg-slate-800" />
                     <Skeleton className="h-4 w-24 bg-slate-800" />
                     <Skeleton className="h-6 w-16 rounded-full bg-slate-800" />
                     <Skeleton className="h-4 w-16 bg-slate-800 text-right" />
                     <Skeleton className="h-8 w-8 rounded-md bg-slate-800 ml-auto" />
                </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Pagination */}
      <div className="flex justify-end gap-2 mt-4">
          <Skeleton className="h-10 w-10 rounded-md bg-slate-800" />
          <Skeleton className="h-10 w-10 rounded-md bg-slate-800" />
          <Skeleton className="h-10 w-10 rounded-md bg-slate-800" />
      </div>
    </DashboardLayout>
  )
}
