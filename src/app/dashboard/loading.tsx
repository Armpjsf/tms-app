import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 bg-slate-800 mb-2" />
        <Skeleton className="h-4 w-64 bg-slate-800" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="space-y-2">
               <Skeleton className="h-4 w-20 bg-slate-800" />
               <Skeleton className="h-8 w-12 bg-slate-800" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-slate-800" />
          </div>
        ))}
      </div>

       {/* Second Row */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="space-y-2">
               <Skeleton className="h-4 w-20 bg-slate-800" />
               <Skeleton className="h-8 w-12 bg-slate-800" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
             <Skeleton className="h-6 w-48 bg-slate-800" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <Skeleton className="h-full w-full bg-slate-800/50 rounded-lg" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
             <Skeleton className="h-6 w-48 bg-slate-800" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <Skeleton className="h-64 w-64 rounded-full bg-slate-800/50" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
