import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function GlobalLoading() {
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-sm animate-pulse">กำลังโหลด...</p>
        
        {/* Optional: Generic page skeleton */}
        <div className="w-full max-w-4xl mt-10 opacity-20">
            <div className="flex items-center gap-4 mb-8">
                <Skeleton className="h-10 w-48 bg-slate-700" />
                <Skeleton className="h-10 w-full bg-slate-700" />
            </div>
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full bg-slate-700" />
                <Skeleton className="h-32 w-full bg-slate-700" />
                <Skeleton className="h-32 w-full bg-slate-700" />
            </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
