"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"

export function MonthFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // 1-12

  // Get initial values from URL or default to current
  const initialYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : currentYear
  const initialMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!) : currentMonth

  const [year, setYear] = useState(initialYear.toString())
  const [month, setMonth] = useState(initialMonth.toString())

  const months = [
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ]

  const years = [
    currentYear,
    currentYear - 1,
    currentYear - 2
  ]

  useEffect(() => {
    // Construct start and end date
    // Start: YYYY-MM-01
    // End: YYYY-MM-LastDay
    const y = parseInt(year)
    const m = parseInt(month)
    
    // Format: YYYY-MM-DD
    const startDate = `${y}-${m.toString().padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const endDate = `${y}-${m.toString().padStart(2, '0')}-${lastDay}`

    // Update URL
    const params = new URLSearchParams()
    params.set("year", year)
    params.set("month", month)
    params.set("startDate", startDate)
    params.set("endDate", endDate)
    
    router.push(`?${params.toString()}`)
  }, [year, month, router])

  return (
    <div className="flex items-center gap-2">
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="w-[120px] bg-slate-900 border-slate-700 text-slate-200">
          <SelectValue placeholder="เลือกเดือน" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="w-[100px] bg-slate-900 border-slate-700 text-slate-200">
          <SelectValue placeholder="เลือกปี" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
