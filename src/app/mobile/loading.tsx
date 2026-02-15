import { Loader2 } from "lucide-react"

export default function MobileLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
      <p className="text-sm animate-pulse">กำลังโหลด...</p>
    </div>
  )
}
