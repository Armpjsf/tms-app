"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
  className?: string
}

export function SearchInput({ placeholder = "Search...", className, ...props }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = React.useState(searchParams.get("q") || "")

  // Debounce search update
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }
      // Reset page to 1 when search changes
      params.set("page", "1")
      
      router.push(`${pathname}?${params.toString()}`)
    }, 500)

    return () => clearTimeout(timer)
  }, [value, router, pathname, searchParams])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const params = new URLSearchParams(searchParams)
            if (value) {
              params.set("q", value)
            } else {
              params.delete("q")
            }
            params.set("page", "1")
            router.push(`${pathname}?${params.toString()}`)
          }
        }}
        placeholder={placeholder}
        className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        {...props}
      />
    </div>
  )
}
