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
              <Skeleton className="h-6 w-64 bg-slate-800" />
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map((i) => (
               <Skeleton key={i} className="h-32 rounded-xl bg-slate-900 border border-slate-800" />
             ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
                  <CardHeader className="border-b border-slate-800/50">
                      <Skeleton className="h-6 w-48 bg-slate-800" />
                  </CardHeader>
                  <CardContent className="pt-6 min-h-[400px] flex items-center justify-center">
                     <Skeleton className="h-[300px] w-full bg-slate-800/20 rounded-lg" />
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="border-slate-700 bg-slate-900 border-2" disabled>
                <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Button>
            <div>
              <Skeleton className="h-10 w-64 bg-slate-800 mb-2" />
              <Skeleton className="h-6 w-96 bg-slate-800" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl">
                  {/* Mimic New MonthFilter (Date Navigator) structure */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-1 rounded-lg">
                    <Skeleton className="h-8 w-8 bg-slate-800 rounded-md" />
                    <Skeleton className="h-8 w-[140px] bg-slate-800 rounded-md" />
                    <Skeleton className="h-8 w-8 bg-slate-800 rounded-md" />
                  </div>
              </div>
              <Skeleton className="h-9 w-56 bg-slate-800 rounded-md" />
          </div>
        </div>

        <AnalyticsContentSkeleton />
    </div>
  )
}
