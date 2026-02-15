"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Vehicle {
  vehicle_plate: string
  vehicle_type: string | null
  [key: string]: any
}

interface VehicleAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  vehicles: Vehicle[]
  onSelect: (vehicle: Vehicle) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function VehicleAutocomplete({
  value,
  onChange,
  vehicles,
  onSelect,
  className,
  placeholder = "ค้นหาทะเบียนรถ...",
  disabled = false
}: VehicleAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Filter based on query
  const filteredVehicles =
    query === ""
      ? vehicles
      : vehicles.filter((v) =>
          v.vehicle_plate.toLowerCase().includes(query.toLowerCase())
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

  // Update query when value changes from outside (e.g. initial load)
  useEffect(() => {
     // If value exists but query is empty, set query to value to show it
     if (value && !query) {
         setQuery(value)
     }
     // If value is cleared, clear query
     if (!value && query) {
         setQuery("")
     }
  }, [value])

  const handleSelect = (vehicle: Vehicle) => {
    onChange(vehicle.vehicle_plate)
    onSelect(vehicle)
    setQuery(vehicle.vehicle_plate)
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
          onFocus={() => !disabled && setOpen(true)}
        //   onClick={() => !disabled && setOpen(true)}
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
          {filteredVehicles.length === 0 ? (
            <div className="p-2 text-sm text-slate-400 text-center">
               ไม่พบข้อมูล
            </div>
          ) : (
            <div className="py-1">
              {filteredVehicles.map((vehicle, index) => (
                <button
                  key={`${vehicle.vehicle_plate}-${index}`}
                  onClick={() => handleSelect(vehicle)}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-slate-700 flex items-center justify-between text-slate-200",
                    value === vehicle.vehicle_plate && "bg-slate-700 font-medium text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-indigo-400" />
                    <span>{vehicle.vehicle_plate}</span>
                    <span className="text-xs text-slate-500">({vehicle.vehicle_type})</span>
                  </div>
                  {value === vehicle.vehicle_plate && (
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
