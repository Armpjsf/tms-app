"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function MonthFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { t } = useLanguage()
  
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Use URL params as Source of Truth
  const year = parseInt(searchParams.get("year") || currentYear.toString())
  const month = parseInt(searchParams.get("month") || currentMonth.toString())

  const months = [
    { value: 1, label: t('months.jan') },
    { value: 2, label: t('months.feb') },
    { value: 3, label: t('months.mar') },
    { value: 4, label: t('months.apr') },
    { value: 5, label: t('months.may') },
    { value: 6, label: t('months.jun') },
    { value: 7, label: t('months.jul') },
    { value: 8, label: t('months.aug') },
    { value: 9, label: t('months.sep') },
    { value: 10, label: t('months.oct') },
    { value: 11, label: t('months.nov') },
    { value: 12, label: t('months.dec') },
  ]

  const years = [
    currentYear + 1,
    currentYear,
    currentYear - 1,
    currentYear - 2
  ]

  const updateFilter = (newMonth: number, newYear: number) => {
    // Only update if changed
    if (newMonth === month && newYear === year) return

    const startDate = `${newYear}-${newMonth.toString().padStart(2, '0')}-01`
    const lastDay = new Date(newYear, newMonth, 0).getDate()
    const endDate = `${newYear}-${newMonth.toString().padStart(2, '0')}-${lastDay}`

    const params = new URLSearchParams(searchParams.toString())
    params.set("year", newYear.toString())
    params.set("month", newMonth.toString())
    params.set("startDate", startDate)
    params.set("endDate", endDate)
    
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false })
    })
  }

  const handlePrevMonth = () => {
    let newMonth = month - 1
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    updateFilter(newMonth, newYear)
  }

  const handleNextMonth = () => {
    let newMonth = month + 1
    let newYear = year
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    updateFilter(newMonth, newYear)
  }

  const currentMonthLabel = months.find(m => m.value === month)?.label || "Select Month"

  return (
    <div className={`flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-1 transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-gray-100 text-muted-foreground hover:text-gray-900"
        onClick={handlePrevMonth}
        disabled={isPending}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-8 px-3 font-medium text-gray-800 hover:bg-gray-100 hover:text-gray-950 min-w-[140px]"
            disabled={isPending}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            {currentMonthLabel} {year}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3 bg-white border-gray-200" align="center">
           <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                  {years.map(y => (
                    <Button
                      key={y}
                      variant={year === y ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter(month, y)}
                      className={cn("w-full transition-all", year === y ? "bg-emerald-600 hover:bg-emerald-700" : "bg-transparent border-gray-200 hover:bg-gray-100 text-gray-700")}
                    >
                      {y}
                    </Button>
                  ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                  {months.map(m => (
                    <Button
                      key={m.value}
                      variant={month === m.value ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => updateFilter(m.value, year)}
                      className={cn(month === m.value ? "w-full text-foreground" : "text-muted-foreground hover:text-gray-900 hover:bg-gray-100")}
                    >
                      {m.label}
                    </Button>
                  ))}
              </div>
           </div>
        </PopoverContent>
      </Popover>

      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 hover:bg-gray-100 text-muted-foreground hover:text-gray-900"
        onClick={handleNextMonth}
        disabled={isPending}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

