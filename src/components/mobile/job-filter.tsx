"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Filter, Calendar, X } from "lucide-react"

export function MobileJobFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [date, setDate] = useState(searchParams.get("date") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "All")
  const [isOpen, setIsOpen] = useState(false)

  // Apply filters
  const handleApply = () => {
    const params = new URLSearchParams()
    if (date) params.set("date", date)
    if (status && status !== "All") params.set("status", status)
    
    router.replace(`${pathname}?${params.toString()}`)
    setIsOpen(false)
  }

  // Clear filters
  const handleClear = () => {
    setDate("")
    setStatus("All")
    router.replace(pathname)
    setIsOpen(false)
  }

  const activeFilterCount = (date ? 1 : 0) + (status !== "All" ? 1 : 0)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
            variant="outline" 
            size="sm" 
            className={`gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:text-white ${
                activeFilterCount > 0 ? 'border-blue-500 text-blue-400' : ''
            }`}
        >
          <Filter size={14} />
          ตัวกรอง
          {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 ml-1 text-[10px] font-bold text-white bg-blue-600 rounded-full">
                  {activeFilterCount}
              </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto rounded-t-xl border-t border-slate-700 bg-slate-900 text-white px-4 py-6">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="text-white flex justify-between items-center">
            <span>ตัวกรองงาน</span>
            {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs text-slate-400 hover:text-white">
                    ล้างค่า
                </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 pb-6">
            {/* Date Filter */}
            <div className="space-y-2">
                <Label htmlFor="date" className="text-slate-300">วันที่</Label>
                <div className="relative">
                    <Input 
                        id="date" 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white pl-10 h-12"
                    />
                    <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
                </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
                <Label className="text-slate-300">สถานะงาน</Label>
                <div className="flex flex-wrap gap-2">
                    {['All', 'Assigned', 'In Transit', 'Completed', 'Cancelled'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                                status === s 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-transparent border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                        >
                            {s === 'All' ? 'ทั้งหมด' : s}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <SheetFooter>
             <Button onClick={handleApply} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 mb-2">
                ดูผลลัพธ์
             </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
