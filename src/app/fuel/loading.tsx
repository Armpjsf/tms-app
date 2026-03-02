import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function FuelLoading() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-48 bg-gray-100 mb-2" />
          <Skeleton className="h-4 w-64 bg-gray-100" />
        </div>
        <Skeleton className="h-10 w-32 bg-gray-100 rounded-md" />
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

      {/* Fuel Graph Skeleton */}
      <Card className="bg-white border-gray-200 mb-6">
          <CardContent className="h-[200px] flex items-center justify-center">
             <Skeleton className="w-full h-full bg-gray-100/20 rounded-lg" />
          </CardContent>
      </Card>

      {/* Fuel List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="bg-white border-gray-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <Skeleton className="w-10 h-10 rounded-lg bg-gray-100" />
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-gray-100" />
                      <Skeleton className="h-3 w-48 bg-gray-100" />
                   </div>
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-6 w-16 bg-gray-100 rounded-full" />
                    <Skeleton className="h-6 w-20 bg-gray-100 rounded-md" />
                </div>
              </CardContent>
            </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
