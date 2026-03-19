"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"

interface PaginationProps {
  totalItems: number
  limit?: number
}

export function Pagination({ totalItems, limit = 50 }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPage = Number(searchParams.get("page")) || 1
  const totalPages = Math.ceil(totalItems / limit)

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 text-xs font-medium text-slate-500">
      <div>
        แสดง {Math.min((currentPage - 1) * limit + 1, totalItems)} ถึง {Math.min(currentPage * limit, totalItems)} จาก {totalItems} รายการ
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white/5 border-white/5 hover:bg-white/10 text-slate-400"
          disabled={currentPage <= 1}
          asChild
        >
          <Link href={currentPage <= 1 ? "#" : createPageURL(currentPage - 1)} aria-disabled={currentPage <= 1}>
            <ChevronLeft size={16} />
          </Link>
        </Button>
        
        <span className="text-slate-300 font-black px-2">
          {currentPage} <span className="text-slate-600 font-medium">/</span> {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white/5 border-white/5 hover:bg-white/10 text-slate-400"
          disabled={currentPage >= totalPages}
          asChild
        >
          <Link href={currentPage >= totalPages ? "#" : createPageURL(currentPage + 1)} aria-disabled={currentPage >= totalPages}>
            <ChevronRight size={16} />
          </Link>
        </Button>
      </div>
    </div>
  )
}
