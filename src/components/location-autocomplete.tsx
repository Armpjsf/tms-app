"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, Check } from "lucide-react"
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
     if (value && !query) {
         setQuery(value)
     }
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
          className={cn("bg-slate-900 border-slate-700 text-white", className)}
        />
      </div>

      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredLocations.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500 text-center">
                ไม่พบข้อมูล
            </div>
          ) : (
            <div className="py-1">
                {filteredLocations.map((loc, index) => (
                <button
                    key={index}
                    onClick={() => handleSelect(loc)}
                    className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-slate-700 flex items-center justify-between transition-colors",
                         value === loc ? "text-white bg-slate-700" : "text-slate-200"
                    )}
                    type="button"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin size={14} className="text-slate-400 flex-shrink-0" />
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
