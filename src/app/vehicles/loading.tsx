import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function VehiclesLoading() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-8 w-48 bg-gray-100 mb-2" />
          <Skeleton className="h-4 w-64 bg-gray-100" />
        </div>
        <div className="flex gap-2">
            <Skeleton className="h-10 w-32 bg-gray-100 rounded-md" />
            <Skeleton className="h-10 w-32 bg-gray-100 rounded-md" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         {[1, 2, 3, 4].map((i) => (
             <div key={i} className="rounded-xl p-4 bg-white border border-gray-200">
                <Skeleton className="h-8 w-16 bg-gray-100 mb-2" />
                <Skeleton className="h-3 w-24 bg-gray-100" />
             </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <Skeleton className="h-10 w-full md:w-1/3 bg-gray-100 rounded-md" />
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-white border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl bg-gray-100" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-gray-100" />
                    <Skeleton className="h-3 w-32 bg-gray-100" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full bg-gray-100" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-full bg-gray-100" />
                <Skeleton className="h-3 w-3/4 bg-gray-100" />
                <Skeleton className="h-3 w-1/2 bg-gray-100" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
