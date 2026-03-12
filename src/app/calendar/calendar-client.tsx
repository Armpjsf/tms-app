"use client"

import { useState, useTransition, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Truck, User, Plus } from "lucide-react"
import Link from "next/link"
import { CalendarJob, getJobsForMonth } from "./actions"
import { JobDialog } from "@/components/planning/job-dialog"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-400",
  Pending: "bg-amber-400",
  Confirmed: "bg-blue-400",
  "In Progress": "bg-indigo-500",
  Delivered: "bg-emerald-500",
  Completed: "bg-emerald-600",
  Finished: "bg-teal-600",
  Closed: "bg-slate-600",
  Cancelled: "bg-red-400",
}

const STATUS_LABELS: Record<string, string> = {
  Draft: "ร่าง",
  Pending: "รอดำเนินการ",
  Confirmed: "ยืนยันแล้ว",
  "In Progress": "กำลังดำเนินการ",
  Delivered: "ส่งแล้ว",
  Completed: "เสร็จสิ้น",
  Finished: "จบงาน",
  Closed: "ปิดงาน",
  Cancelled: "ยกเลิก",
}

const THAI_MONTHS = [
  "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
]

const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

interface Props {
  initialJobs: CalendarJob[]
  initialYear: number
  initialMonth: number
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
}

export function CalendarClient({ 
  initialJobs, 
  initialYear, 
  initialMonth,
  drivers,
  vehicles,
  customers,
  routes
}: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [jobs, setJobs] = useState<CalendarJob[]>(initialJobs)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Sync state with props after router.refresh()
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  const changeMonth = (delta: number) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDate(null)

    startTransition(async () => {
      const data = await getJobsForMonth(newYear, newMonth)
      setJobs(data)
    })
  }

  const goToToday = () => {
    const now = new Date()
    const newYear = now.getFullYear()
    const newMonth = now.getMonth() + 1
    setYear(newYear)
    setMonth(newMonth)
    setSelectedDate(formatDate(now))
    startTransition(async () => {
      const data = await getJobsForMonth(newYear, newMonth)
      setJobs(data)
    })
  }

  // Group jobs by date
  const jobsByDate: Record<string, CalendarJob[]> = {}
  jobs.forEach(job => {
    const d = job.Plan_Date
    if (!jobsByDate[d]) jobsByDate[d] = []
    jobsByDate[d].push(job)
  })

  // Calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const todayStr = formatDate(today)

  const selectedJobs = selectedDate ? (jobsByDate[selectedDate] || []) : []

  // Status summary for the month
  const statusCounts: Record<string, number> = {}
  jobs.forEach(j => {
    statusCounts[j.Job_Status] = (statusCounts[j.Job_Status] || 0) + 1
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-950 p-8 rounded-br-[4rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <CalendarDays size={28} />
            </div>
            ปฏิทินงานขนส่ง
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Operational Command — Monthly Overview</p>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={goToToday}
            className="px-6 py-3 bg-slate-900 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-800"
          >
            Today
          </button>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={16} />
            New Job
          </button>
        </div>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([status, count]) => (
          <div key={status} className="flex items-center gap-3 bg-white/80 backdrop-blur-md rounded-xl px-4 py-3 border border-white/50 shadow-sm">
            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status] || 'bg-gray-400'} shadow-sm`} />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{STATUS_LABELS[status] || status}</span>
            <span className="ml-auto text-sm font-black text-gray-900">{count}</span>
          </div>
        ))}
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-br-[5rem] rounded-tl-[3rem] border border-white shadow-2xl overflow-hidden relative">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-indigo-100 rounded-xl transition-colors">
            <ChevronLeft size={20} className="text-indigo-600" />
          </button>
          <h2 className="text-xl font-black text-gray-900">
            {THAI_MONTHS[month]} {year + 543}
            {isPending && <span className="ml-2 text-xs text-gray-400 font-normal animate-pulse">กำลังโหลด...</span>}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-indigo-100 rounded-xl transition-colors">
            <ChevronRight size={20} className="text-indigo-600" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {THAI_DAYS.map((day, i) => (
            <div key={day + i} className={`text-center py-2 text-xs font-black uppercase tracking-widest ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-50 bg-gray-50/30" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayJobs = jobsByDate[dateStr] || []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dayOfWeek = new Date(year, month - 1, day).getDay()

            return (
              <motion.div
                key={dateStr}
                whileHover={{ scale: 0.98 }}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`min-h-[100px] border-b border-r border-gray-50 p-1.5 cursor-pointer transition-all
                  ${isSelected ? 'bg-indigo-50 ring-2 ring-indigo-400 ring-inset' : 'hover:bg-gray-50'}
                  ${isToday ? 'bg-emerald-50/50' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold
                    ${isToday ? 'bg-emerald-500 text-white' : ''}
                    ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-700'}
                  `}>
                    {day}
                  </span>
                  {dayJobs.length > 0 && (
                    <span className="text-[10px] font-black text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">
                      {dayJobs.length}
                    </span>
                  )}
                </div>

                {/* Job indicators */}
                <div className="space-y-0.5">
                  {dayJobs.slice(0, 3).map(job => (
                    <div 
                      key={job.Job_ID} 
                      className={`h-1.5 rounded-full ${STATUS_COLORS[job.Job_Status] || 'bg-gray-300'}`}
                      title={`${job.Customer_Name || job.Job_ID} — ${STATUS_LABELS[job.Job_Status] || job.Job_Status}`}
                    />
                  ))}
                  {dayJobs.length > 3 && (
                    <p className="text-[9px] text-gray-400 font-bold text-center">+{dayJobs.length - 3} อื่นๆ</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Detail */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-br-[4rem] rounded-tl-[2rem] border border-white shadow-2xl overflow-hidden mt-8"
          >
            <div className="px-8 py-6 border-b border-gray-100 bg-slate-950 flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
              <h3 className="text-lg font-black text-white relative z-10">
                DATE DETAILS: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest relative z-10">{selectedJobs.length} Operations Scheduled</span>
            </div>

            {selectedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CalendarDays size={48} strokeWidth={1.5} />
                <p className="mt-3 font-bold">ไม่มีงานในวันนี้</p>
                <button 
                  onClick={() => setIsDialogOpen(true)}
                  className="mt-3 text-sm text-indigo-600 font-bold hover:underline"
                >
                  + สร้างงานใหม่
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedJobs.map(job => (
                  <Link key={job.Job_ID} href={`/admin/jobs/${job.Job_ID}`} className="block hover:bg-gray-50 transition-colors">
                    <div className="px-6 py-4 flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLORS[job.Job_Status] || 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm truncate">{job.Customer_Name || job.Job_ID}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${STATUS_COLORS[job.Job_Status] || 'bg-gray-400'}`}>
                            {STATUS_LABELS[job.Job_Status] || job.Job_Status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          {job.Route_Name && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {job.Route_Name}
                            </span>
                          )}
                          {job.Driver_Name && (
                            <span className="flex items-center gap-1">
                              <User size={12} /> {job.Driver_Name}
                            </span>
                          )}
                          {job.Vehicle_Plate && (
                            <span className="flex items-center gap-1">
                              <Truck size={12} /> {job.Vehicle_Plate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <JobDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode="create"
        drivers={drivers}
        vehicles={vehicles}
        customers={customers}
        routes={routes}
        defaultDate={selectedDate || undefined}
      />
    </div>
  )
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
