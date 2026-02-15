import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pb-24 pt-16 px-4">
      <MobileHeader title="โปรไฟล์" />
      
      {/* Profile Header Skeleton */}
      <Card className="bg-slate-900 border-slate-800 mb-4">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full bg-slate-800" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Card Skeleton */}
      <Card className="bg-slate-900 border-slate-800 mb-4">
        <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-24 bg-slate-800" />
                    <Skeleton className="h-3 w-20 bg-slate-800" />
                </div>
                <Skeleton className="w-16 h-16 rounded-full bg-slate-800" />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-2">
                   <Skeleton className="h-3 w-10 bg-slate-800" />
                   <Skeleton className="h-6 w-8 bg-slate-800" />
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Skeleton className="h-3 w-10 bg-slate-800" />
                   <Skeleton className="h-6 w-8 bg-slate-800" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-3 w-10 bg-slate-800" />
                    <Skeleton className="h-6 w-8 bg-slate-800" />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Menu Skeleton */}
      <Card className="bg-slate-900 border-slate-800 mb-4">
        <CardContent className="py-2 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-5 h-5 bg-slate-800" />
                        <Skeleton className="h-4 w-24 bg-slate-800" />
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
