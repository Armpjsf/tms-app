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
    <div className="flex items-center justify-between mt-4 text-lg font-bold font-medium text-muted-foreground">
      <div>
        แสดง {Math.min((currentPage - 1) * limit + 1, totalItems)} ถึง {Math.min(currentPage * limit, totalItems)} จาก {totalItems} รายการ
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-muted/50 border-border/5 hover:bg-muted/80 text-muted-foreground"
          disabled={currentPage <= 1}
          asChild
        >
          <Link href={currentPage <= 1 ? "#" : createPageURL(currentPage - 1)} aria-disabled={currentPage <= 1}>
            <ChevronLeft size={16} />
          </Link>
        </Button>
        
        <span className="text-muted-foreground font-black px-2">
          {currentPage} <span className="text-muted-foreground font-medium">/</span> {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-muted/50 border-border/5 hover:bg-muted/80 text-muted-foreground"
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

