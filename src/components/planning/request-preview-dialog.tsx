"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PremiumButton } from "@/components/ui/premium-button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Calendar, 
  Building2, 
  ClipboardList,
  ArrowRight
} from "lucide-react"
import { Job } from "@/types/database"

interface RequestPreviewDialogProps {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlan: () => void
}

export function RequestPreviewDialog({
  job,
  open,
  onOpenChange,
  onPlan
}: RequestPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-orange-500/10 border-b border-orange-500/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                <ClipboardList size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tighter text-gray-900">
                  รายละเอียดคำขอรถ
                </DialogTitle>
                <p className="text-base font-bold font-black text-orange-600 uppercase tracking-[0.2em]">
                  Shipment Request Details
                </p>
              </div>
            </div>
            <Badge className="bg-orange-500/20 text-orange-600 border-0 font-black uppercase tracking-widest px-3 py-1">
              {job.Job_Status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest">Job ID</p>
              <p className="text-lg font-bold text-gray-900">{job.Job_ID}</p>
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest">วันที่ต้องการรถ</p>
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Calendar size={16} className="text-orange-500" />
                <span>{job.Plan_Date ? new Date(job.Plan_Date).toLocaleDateString('th-TH', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : "ไม่ได้ระบุ"}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest">ข้อมูลลูกค้า</p>
                <p className="font-bold text-gray-900">{job.Customer_Name || "ไม่ระบุชื่อลูกค้า"}</p>
              </div>
            </div>
          </div>

          {/* Location Timeline */}
          <div className="space-y-4">
            <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest">เส้นทางขนส่ง</p>
            <div className="relative pl-8 space-y-8">
              {/* Vertical line connector */}
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-dashed bg-gradient-to-b from-orange-500 to-emerald-500 opacity-20" />
              
              {/* Pickup */}
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
                <div>
                  <p className="text-base font-bold font-black text-orange-600 uppercase tracking-widest mb-1">จุดรับสินค้า (Pickup)</p>
                  <p className="font-bold text-gray-900 leading-relaxed">
                    {job.Origin_Location || "ไม่ได้ระบุสถานที่รับ"}
                  </p>
                </div>
              </div>

              {/* Delivery */}
              <div className="relative">
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-base font-bold font-black text-emerald-600 uppercase tracking-widest mb-1">จุดส่งสินค้า (Delivery)</p>
                  <p className="font-bold text-gray-900 leading-relaxed">
                    {job.Dest_Location || "ไม่ได้ระบุสถานที่ส่ง"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base font-bold font-black text-gray-400 uppercase tracking-widest">
                <Package size={14} className="text-gray-400" />
                ประเภทสินค้า
              </div>
              <p className="font-bold text-gray-900">{job.Cargo_Type || "-"}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-4 border-t border-gray-50">
             <p className="text-base font-bold font-black text-gray-400 uppercase tracking-widest">หมายเหตุจากลูกค้า (Notes)</p>
             <div className="p-4 bg-yellow-50 rounded-2xl text-xl font-medium text-gray-700 leading-relaxed border border-yellow-100 italic">
                &quot;{job.Notes || "ไม่มีหมายเหตุเพิ่มเติม"}&quot;
             </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-gray-50 flex justify-between gap-4 border-t border-gray-100">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-gray-500 font-bold uppercase tracking-widest text-base font-bold"
          >
            ย้อนกลับ
          </Button>
          <PremiumButton onClick={onPlan} className="h-14 px-8 rounded-2xl">
            วางแผนงาน <ArrowRight className="ml-2 w-5 h-5" />
          </PremiumButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

