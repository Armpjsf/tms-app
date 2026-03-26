import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function AnalyticsContentSkeleton() {
  return (
    <div className="space-y-8">
        {/* Section 1: Financial & Commercial Skeleton */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg bg-emerald-500/20" />
              <Skeleton className="h-6 w-64 bg-gray-100" />
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map((i) => (
               <Skeleton key={i} className="h-32 rounded-xl bg-white border border-gray-200" />
             ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white/80 border-gray-200">
                  <CardHeader className="border-b border-gray-200">
                      <Skeleton className="h-6 w-48 bg-gray-100" />
                  </CardHeader>
                  <CardContent className="pt-6 min-h-[400px] flex items-center justify-center">
                     <Skeleton className="h-[300px] w-full bg-gray-100/20 rounded-lg" />
                  </CardContent>
              </Card>
               <div className="space-y-6">
                 {/* Placeholder for side content */}
               </div>
          </div>
        </section>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-12 pb-20">
        {/* Header Section Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-gray-200 pb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="border-gray-200 bg-white border-2" disabled>
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div>
              <Skeleton className="h-10 w-64 bg-gray-100 mb-2" />
              <Skeleton className="h-6 w-96 bg-gray-100" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-xl">
                  {/* Mimic New MonthFilter (Date Navigator) structure */}
                  <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg">
                    <Skeleton className="h-8 w-8 bg-gray-100 rounded-md" />
                    <Skeleton className="h-8 w-[140px] bg-gray-100 rounded-md" />
                    <Skeleton className="h-8 w-8 bg-gray-100 rounded-md" />
                  </div>
              </div>
              <Skeleton className="h-9 w-56 bg-gray-100 rounded-md" />
          </div>
        </div>

        <AnalyticsContentSkeleton />
    </div>
  )
}
