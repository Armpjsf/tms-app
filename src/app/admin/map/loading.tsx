import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <Skeleton className="h-8 w-[200px] mb-2" />
           <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-9 w-[100px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
           <Skeleton className="h-[500px] rounded-xl" />
        </div>
        <div>
           <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>
    </div>
  )
}
