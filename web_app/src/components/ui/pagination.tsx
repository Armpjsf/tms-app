"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface PaginationProps {
  totalItems: number
  limit?: number
}

export function Pagination({ totalItems, limit = 50 }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPage = Number(searchParams.get("page")) || 1
  const totalPages = Math.ceil(totalItems / limit)

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(createPageURL(page))
    }
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
      <div>
        แสดง {Math.min((currentPage - 1) * limit + 1, totalItems)} ถึง {Math.min(currentPage * limit, totalItems)} จาก {totalItems} รายการ
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0 bg-transparent border-white/10 hover:bg-white/5"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-white font-medium px-2">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0 bg-transparent border-white/10 hover:bg-white/5"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
