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
            className={`gap-2 border-gray-200 bg-white text-gray-700 hover:text-white ${
                activeFilterCount > 0 ? 'border-blue-500 text-emerald-500' : ''
            }`}
        >
          <Filter size={14} />
          ตัวกรอง
          {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 ml-1 text-foreground bg-emerald-600 rounded-full">
                  {activeFilterCount}
              </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto rounded-t-xl border-t border-gray-200 bg-white text-white px-4 py-6">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="text-white flex justify-between items-center">
            <span>ตัวกรองงาน</span>
            {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-foreground">
                    ล้างค่า
                </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 pb-6">
            {/* Date Filter & Presets */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <Label htmlFor="date" className="text-gray-700">วันที่</Label>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={() => setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }))}
                            className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-bold uppercase"
                        >วันนี้</button>
                        <button 
                            type="button" 
                            onClick={() => {
                                const d = new Date(); d.setDate(d.getDate() + 1);
                                setDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }));
                            }}
                            className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-bold uppercase"
                        >พรุ่งนี้</button>
                        <button 
                            type="button" 
                            onClick={() => setDate("")}
                            className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-bold uppercase"
                        >ทั้งหมด</button>
                    </div>
                </div>
                <div className="relative">
                    <Input 
                        id="date" 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-gray-100 border-gray-200 text-gray-900 pl-10 h-12"
                    />
                    <Calendar className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
                </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
                <Label className="text-gray-700">สถานะงาน</Label>
                <div className="flex flex-wrap gap-2">
                    {['All', 'Assigned', 'In Transit', 'Completed', 'Cancelled'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`px-4 py-2 rounded-full text-xl border transition-colors ${
                                status === s 
                                    ? 'bg-emerald-600 border-blue-600 text-white' 
                                    : 'bg-transparent border-gray-200 text-muted-foreground hover:border-slate-500'
                            }`}
                        >
                            {s === 'All' ? 'ทั้งหมด' : s}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <SheetFooter>
             <Button onClick={handleApply} className="w-full h-12 text-base bg-emerald-600 hover:bg-blue-700 mb-2">
                ดูผลลัพธ์
             </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

