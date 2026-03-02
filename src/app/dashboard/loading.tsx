import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 bg-gray-100 mb-2" />
        <Skeleton className="h-4 w-64 bg-gray-100" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl bg-white border border-gray-200 flex items-center justify-between">
            <div className="space-y-2">
               <Skeleton className="h-4 w-20 bg-gray-100" />
               <Skeleton className="h-8 w-12 bg-gray-100" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>

       {/* Second Row */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl bg-white border border-gray-200 flex items-center justify-between">
            <div className="space-y-2">
               <Skeleton className="h-4 w-20 bg-gray-100" />
               <Skeleton className="h-8 w-12 bg-gray-100" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 border-gray-200">
          <CardHeader>
             <Skeleton className="h-6 w-48 bg-gray-100" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <Skeleton className="h-full w-full bg-gray-50 rounded-lg" />
          </CardContent>
        </Card>

        <Card className="bg-white/80 border-gray-200">
          <CardHeader>
             <Skeleton className="h-6 w-48 bg-gray-100" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <Skeleton className="h-64 w-64 rounded-full bg-gray-50" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
