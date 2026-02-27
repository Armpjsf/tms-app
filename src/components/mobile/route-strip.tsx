"use client"

import { Navigation } from "lucide-react"

interface RouteStripProps {
  origin?: string | null
  destination?: string | null
  distanceKm?: number | null
  status?: string
}

export function RouteStrip({ origin, destination, distanceKm, status }: RouteStripProps) {
  const isInTransit = status === 'In Transit'

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 shadow-xl">
      {/* Distance Header */}
      {distanceKm && (
        <div className="flex items-center gap-2 mb-3">
          <Navigation size={14} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Distance to Arrival
          </span>
          <span className="text-sm font-black text-emerald-400 ml-auto">
            {distanceKm} km
          </span>
        </div>
      )}

      {/* Route Visual Strip */}
      <div className="relative flex items-center gap-3">
        {/* Origin dot */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
        </div>

        {/* Connection line */}
        <div className="flex-1 relative h-0.5">
          <div className="absolute inset-0 bg-slate-800 rounded-full" />
          {isInTransit && (
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          )}
          {/* Truck icon on the line */}
          {isInTransit && (
            <div className="absolute top-1/2 -translate-y-1/2 bg-slate-900 p-1 rounded-full border border-blue-500/30" style={{ left: '55%' }}>
              <Navigation size={10} className="text-blue-400 rotate-90" />
            </div>
          )}
        </div>

        {/* Destination dot */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-500/20" />
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2">
        <div className="max-w-[45%]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">ต้นทาง</p>
          <p className="text-[11px] text-slate-300 font-medium truncate">
            {origin || 'ไม่ระบุ'}
          </p>
        </div>
        <div className="max-w-[45%] text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">ปลายทาง</p>
          <p className="text-[11px] text-slate-300 font-medium truncate">
            {destination || 'ไม่ระบุ'}
          </p>
        </div>
      </div>
    </div>
  )
}
