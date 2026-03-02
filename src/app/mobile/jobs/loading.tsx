import { MobileHeader } from "@/components/mobile/mobile-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-background pb-24 pt-16 px-4">
      <MobileHeader title="กำลังโหลด..." />
      
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                     <Skeleton className="w-10 h-10 rounded-lg bg-gray-100" />
                     <div className="space-y-2">
                       <Skeleton className="h-4 w-32 bg-gray-100" />
                       <Skeleton className="h-3 w-16 rounded-full bg-gray-100" />
                     </div>
                  </div>
                  <Skeleton className="h-4 w-16 bg-gray-100" />
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-200">
                   <Skeleton className="h-3 w-3/4 bg-gray-100" />
                   <Skeleton className="h-3 w-1/2 bg-gray-100" />
                </div>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}
