"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, MapPin, ChevronRight, Calendar, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Job } from "@/types/database"

type MobileJobListItem = Pick<Job, "Job_ID" | "Customer_Name" | "Dest_Location" | "Route_Name" | "Job_Status"> & {
  Pickup_Date?: string | null
  Delivery_Date?: string | null
}

const fmtDayMonth = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : null

// Map any Job_Status the system uses onto a driver-facing label + colour.
// Admins close jobs with several closed statuses (Delivered/Billed/Paid/Closed/…);
// the previous switch only handled Completed/Verified, so every other closed
// status fell through to "รอเริ่มงาน" and looked like the status never changed.
const SUCCESS_STATUSES = ['Completed', 'Complete', 'Delivered', 'Finished', 'Closed', 'Billed', 'Paid']
const ACTIVE_STATUSES = ['In Progress', 'In Transit', 'Arrived', 'Arrived Pickup', 'Arrived Dropoff', 'Picked Up']
function statusMeta(status?: string | null): { label: string; className: string } {
  const s = status || ''
  if (s === 'Verified') return { label: 'สำเร็จ (ตรวจสอบแล้ว)', className: 'bg-emerald-100 text-emerald-700' }
  if (SUCCESS_STATUSES.includes(s)) return { label: 'สำเร็จ', className: 'bg-emerald-100 text-emerald-700' }
  if (s === 'Rejected') return { label: 'ถูกปฏิเสธ', className: 'bg-destructive/10 text-destructive' }
  if (s === 'Cancelled' || s === 'Canceled') return { label: 'ยกเลิก', className: 'bg-destructive/10 text-destructive' }
  if (s === 'SOS') return { label: 'ฉุกเฉิน (SOS)', className: 'bg-destructive/10 text-destructive' }
  if (ACTIVE_STATUSES.includes(s)) return { label: 'กำลังดำเนินการ', className: 'bg-primary/10 text-primary' }
  return { label: 'รอเริ่มงาน', className: 'bg-muted text-muted-foreground' }
}

export function MobileJobSearchList({ jobs }: { jobs: MobileJobListItem[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredJobs = jobs.filter(job => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    
    // Support searching the full Job_ID, individual tokens (comma separated) or customer names
    return (
      job.Job_ID.toLowerCase().includes(q) ||
      (job.Customer_Name || "").toLowerCase().includes(q) ||
      (job.Dest_Location || "").toLowerCase().includes(q) ||
      (job.Route_Name || "").toLowerCase().includes(q)
    );
  })

  return (
    <div className="space-y-6">
      {/* Search Bar - Premium Style */}
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาเลขงาน, ชื่อลูกค้า..." 
          className="w-full h-16 pl-14 pr-6 rounded-3xl bg-card/50 backdrop-blur-xl border border-border/10 text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-lg shadow-sm"
        />
      </div>

      {/* Job Grid / List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
            <Truck className="text-muted-foreground/30 mx-auto mb-4" size={48} />
            <p className="text-muted-foreground font-bold">ไม่พบรายการงานในขณะนี้</p>
          </div>
        ) : filteredJobs.map((job) => (
          <Link href={`/mobile/jobs/${job.Job_ID}`} key={job.Job_ID} className="block active:scale-[0.98] transition-all">
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
              {/* Status & Date */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Calendar size={14} />
                    รับ {fmtDayMonth(job.Pickup_Date) || "ไม่ระบุ"}
                  </span>
                  {job.Delivery_Date && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      <MapPin size={13} />
                      ส่ง {fmtDayMonth(job.Delivery_Date)}
                    </span>
                  )}
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
                  statusMeta(job.Job_Status).className
                )}>
                  {statusMeta(job.Job_Status).label}
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground leading-tight">{job.Customer_Name}</h3>
                <p className="text-xs font-medium text-muted-foreground">#{job.Job_ID.toUpperCase()}</p>
              </div>

              {/* Route */}
              <div className="flex items-start gap-3 pt-2 border-t border-border/50">
                <MapPin size={16} className="text-accent mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">จุดส่งสินค้า</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {job.Dest_Location || job.Route_Name}
                  </p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground/30 self-center" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
