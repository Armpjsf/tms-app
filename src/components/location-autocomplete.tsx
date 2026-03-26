"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface LocationAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  locations: string[]
  className?: string
  placeholder?: string
}

export function LocationAutocomplete({
  value,
  onChange,
  locations = [],
  className,
  placeholder = "ค้นหาสถานที่..."
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Filter based on query
  const filteredLocations =
    query === ""
      ? locations
      : locations.filter((loc) => 
          loc && loc.toLowerCase().includes(query.toLowerCase())
        ).sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(query.toLowerCase())
            const bStarts = b.toLowerCase().startsWith(query.toLowerCase())
            if (aStarts && !bStarts) return -1
            if (!aStarts && bStarts) return 1
            return 0
        })

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Update query when value changes from outside
  useEffect(() => {
     if (value && value !== query) {
         setQuery(value)
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleSelect = (location: string) => {
    onChange(location)
    setQuery(location)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      onChange(e.target.value)
      setOpen(true)
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={open ? query : (value || "")}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={placeholder}
          className={cn("bg-muted border-border text-foreground font-black placeholder:text-muted-foreground placeholder:font-bold", className)}
        />
      </div>

      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredLocations.length === 0 ? (
            <div className="px-3 py-2 text-xl text-muted-foreground font-bold text-center">
                ไม่พบข้อมูล
            </div>
          ) : (
            <div className="py-1">
                {filteredLocations.map((loc, index) => (
                <button
                    key={index}
                    onClick={() => handleSelect(loc)}
                    className={cn(
                        "w-full text-left px-3 py-2 text-xl hover:bg-muted flex items-center justify-between transition-colors",
                         value === loc ? "text-foreground bg-muted" : "text-foreground"
                    )}
                    type="button"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{loc}</span>
                    </div>
                </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

