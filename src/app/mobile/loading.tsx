import { Loader2 } from "lucide-react"

export default function MobileLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-gray-400">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
      <p className="text-sm animate-pulse">กำลังโหลด...</p>
    </div>
  )
}
