"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/providers/language-provider"
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
  const { t } = useLanguage()
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
    setQuery(value || "")
  }, [value])

  // Nudge (data-quality ladder step 2–3): the typed name is not an exact match
  // in the location master, so saving it creates a brand-new (possibly duplicate)
  // location. We warn but never block — picking an existing entry is just made
  // the obviously easier path.
  const trimmed = (query || "").trim()
  const isNewLocation =
    trimmed.length > 0 &&
    !locations.some((loc) => (loc || "").trim().toLowerCase() === trimmed.toLowerCase())

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
          placeholder={placeholder || t('common.search')}
          className={cn("bg-muted border-border text-foreground font-black placeholder:text-muted-foreground placeholder:font-bold", className)}
        />
      </div>

      {/* Warn when the current text isn't a known location — nudges reuse over
          creating duplicates (and avoids coord-less stops that drop from ESG). */}
      {isNewLocation && (
        <div className="mt-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-sm font-bold">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>สถานที่ใหม่ (ยังไม่มีในระบบ) — เลือกจากรายการเพื่อเลี่ยงข้อมูลซ้ำ</span>
        </div>
      )}

      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredLocations.length === 0 ? (
            <div className="px-3 py-2 text-xl text-muted-foreground font-bold text-center">
                {t('common.no_data')}
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

