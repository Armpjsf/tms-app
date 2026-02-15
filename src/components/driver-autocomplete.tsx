"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Driver {
  Driver_ID: string
  Driver_Name: string | null
  [key: string]: any
}

interface DriverAutocompleteProps {
  value?: string // Driver_ID
  onChange: (value: string) => void
  drivers: Driver[]
  onSelect?: (driver: Driver) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function DriverAutocomplete({
  value,
  onChange,
  drivers,
  onSelect,
  className,
  placeholder = "ค้นหาคนขับ...",
  disabled = false
}: DriverAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Find selected driver object for display
  const selectedDriver = drivers.find(d => d.Driver_ID === value)

  // Filter based on query
  const filteredDrivers =
    query === ""
      ? drivers
      : drivers.filter((d) =>
          (d.Driver_Name?.toLowerCase() || "").includes(query.toLowerCase())
        )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sync query with value
  useEffect(() => {
      if (selectedDriver && !open) {
          setQuery(selectedDriver.Driver_Name || "")
      } else if (!value && !open) {
          setQuery("")
      }
  }, [value, selectedDriver, open])

  const handleSelect = (driver: Driver) => {
    onChange(driver.Driver_ID)
    if (onSelect) onSelect(driver)
    setQuery(driver.Driver_Name || "")
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      if (!open) setOpen(true)
      // Note: We don't call onChange(e.target.value) here because value is ID, input is Name.
      // We only call onChange when a valid driver is selected.
      // Or we could clear the ID if input changes? 
      // Let's clear ID if user types something new to avoid mismatch.
      if (value) {
           // If user modifies text, they might be searching for a new one.
           // But if they just fix a typo?
           // Safest is: onChange('') to clear ID, forcing selection.
           // But that might flicker.
           // Let's keep ID for now, but if they select from list, it updates.
      }
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
       <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn("pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500", className)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
             <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredDrivers.length === 0 ? (
            <div className="p-2 text-sm text-slate-400 text-center">
               ไม่พบข้อมูล
            </div>
          ) : (
            <div className="py-1">
              {filteredDrivers.map((driver, index) => (
                <button
                  key={`${driver.Driver_ID}-${index}`}
                  onClick={() => handleSelect(driver)}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-slate-700 flex items-center justify-between text-slate-200",
                    value === driver.Driver_ID && "bg-slate-700 font-medium text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-indigo-400" />
                    <span>{driver.Driver_Name}</span>
                  </div>
                  {value === driver.Driver_ID && (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
