"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Package, Truck, CheckCircle2, AlertCircle, Filter } from "lucide-react"

export function HistoryStatusFilter({ initialValue }: { initialValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    params.set("page", "1") // Reset to first page on filter change
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <label className="text-muted-foreground text-sm flex items-center gap-1">
        <Filter className="w-3 h-3" /> สถานะ
      </label>
      <Select defaultValue={initialValue || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full bg-background border-input text-foreground h-10">
          <SelectValue placeholder="เลือกสถานะ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          <SelectItem value="New">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-blue-400" />
              <span>ใหม่</span>
            </div>
          </SelectItem>
          <SelectItem value="Assigned">
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-indigo-400" />
              <span>มอบหมายแล้ว</span>
            </div>
          </SelectItem>
          <SelectItem value="In Progress">
             <span>กำลังดำเนินงาน</span>
          </SelectItem>
          <SelectItem value="Complete">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>เสร็จสิ้น</span>
            </div>
          </SelectItem>
          <SelectItem value="Delivered">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>ส่งแล้ว</span>
            </div>
          </SelectItem>
          <SelectItem value="Failed">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400" />
              <span>ล้มเหลว</span>
            </div>
          </SelectItem>
          <SelectItem value="Cancelled">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-slate-400" />
              <span>ยกเลิก</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
