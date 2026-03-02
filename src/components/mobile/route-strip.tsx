"use client"

import { Navigation } from "lucide-react"

interface RoutePoint {
  name: string
  lat?: string | number
  lng?: string | number
}

interface RouteStripProps {
  origin?: string | null
  destination?: string | null
  destinations?: RoutePoint[] | null
  distanceKm?: number | null
  status?: string
}

export function RouteStrip({ origin, destination, destinations, distanceKm, status }: RouteStripProps) {
  const isInTransit = status === 'In Transit'
  const isMultiStop = Array.isArray(destinations) && destinations.length > 1

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-xl">
      {/* Distance Header */}
      {distanceKm && (
        <div className="flex items-center gap-2 mb-3">
          <Navigation size={14} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Distance to Arrival
          </span>
          <span className="text-sm font-black text-emerald-400 ml-auto">
            {distanceKm} km
          </span>
        </div>
      )}

      {/* Route Visual Strip */}
      <div className="relative flex items-center gap-2 px-1">
        {/* Origin dot */}
        <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 shrink-0" />

        {/* Multi-stop Timeline */}
        <div className="flex-1 relative flex items-center h-4">
          <div className="absolute inset-x-0 h-0.5 bg-gray-100 rounded-full" />
          
          {isInTransit && (
            <div 
              className="absolute left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse transition-all duration-1000"
              style={{ width: '40%' }}
            />
          )}

          {/* Intermediate Stops */}
          {isMultiStop && destinations.slice(0, -1).map((_, idx) => {
              const pos = ((idx + 1) / destinations.length) * 100;
              return (
                <div 
                    key={idx}
                    className="absolute w-1.5 h-1.5 rounded-full bg-gray-300 border border-white translate-x-[-50%]"
                    style={{ left: `${pos}%` }}
                />
              )
          })}

          {/* Animated Truck/Icon */}
          {isInTransit && (
            <div 
                className="absolute bg-white p-1 rounded-full border border-blue-500/20 shadow-lg -translate-x-1/2" 
                style={{ left: '35%' }}
            >
              <Navigation size={10} className="text-emerald-500 rotate-90" />
            </div>
          )}
        </div>

        {/* Final Destination dot */}
        <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-500/10 shrink-0" />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3">
        <div className="max-w-[40%]">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Origin</p>
          <p className="text-[10px] text-gray-900 font-black truncate">
            {origin || 'ไม่ระบุ'}
          </p>
        </div>

        {isMultiStop && (
           <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Stops</p>
              <p className="text-[10px] text-gray-900 font-black">{destinations.length} Points</p>
           </div>
        )}

        <div className="max-w-[40%] text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-0.5">Destination</p>
          <p className="text-[10px] text-gray-900 font-black truncate">
            {destination || (isMultiStop ? destinations[destinations.length - 1].name : 'ไม่ระบุ')}
          </p>
        </div>
      </div>
    </div>
  )
}
