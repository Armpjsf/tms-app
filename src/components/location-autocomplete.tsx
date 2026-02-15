"use client"

import { useState, useRef, useEffect } from "react"
import { Search, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface LocationAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  locations: string[]
  className?: string
  placeholder?: string
}

import { createPortal } from "react-dom"

export function LocationAutocomplete({
  value,
  onChange,
  locations = [],
  className,
  placeholder = "ค้นหาสถานที่..."
}: LocationAutocompleteProps) {
  // Debug
  // console.log('LocationAutocomplete locations:', locations.length)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  // State for portal positioning
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter locations based on query
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

  const updatePosition = () => {
    if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setCoords({
            top: rect.bottom,
            left: rect.left,
            width: rect.width
        })
    }
  }

  // Update position when opening or scrolling
  useEffect(() => {
    if (open) {
        updatePosition()
        // Capture scroll events from all parents (including Dialog)
        window.addEventListener('scroll', updatePosition, true)
        window.addEventListener('resize', updatePosition)
    }
    return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          const portalEl = document.getElementById('location-autocomplete-portal')
          if (portalEl && portalEl.contains(event.target as Node)) return
          
          setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (location: string) => {
    onChange(location)
    setQuery("")
    setOpen(false)
  }
  
  // Dropdown Content
  const dropdownContent = (
      <div 
        id="location-autocomplete-portal"
        style={{ 
            position: 'fixed', 
            top: coords.top, 
            left: coords.left, 
            width: coords.width,
            zIndex: 2147483647
        }}
        className="mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto"
      >
          <div className="py-1">
            {filteredLocations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500 text-center">
                    ไม่พบข้อมูล
                </div>
            ) : (
                filteredLocations.map((loc, index) => (
                <button
                    key={index}
                    onClick={() => handleSelect(loc)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    type="button"
                >
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-white truncate">{loc}</span>
                </button>
                ))
            )}
          </div>
      </div>
  )

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={open ? query : (value || "")}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) {
                setOpen(true)
                updatePosition()
            }
            onChange(e.target.value)
          }}
          onFocus={() => {
            setOpen(true)
            setQuery("")
            updatePosition()
          }}
          onClick={() => {
            setOpen(true)
            updatePosition()
          }}
          placeholder={placeholder}
          className={cn("bg-slate-900 border-slate-700 text-white", className)}
        />
      </div>

      {mounted && open && createPortal(dropdownContent, document.body)}
    </div>
  )
}
