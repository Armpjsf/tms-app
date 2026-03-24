"use client"

import { Navigation, Truck, MapPin } from "lucide-react"

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
  const isInTransit = status === 'In Transit' || status === 'In Progress'
  const isMultiStop = Array.isArray(destinations) && destinations.length > 1
  const isCompleted = status === 'Completed'

  return (
    <div className="glass-panel border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 text-primary/5 pointer-events-none">
          <Navigation size={60} />
      </div>

      {/* Distance / ETA Status */}
      <div className="flex items-center gap-2 mb-6 px-1">
        <Navigation size={14} className={isCompleted ? "text-emerald-400" : "text-primary"} />
        <span className="text-base font-bold font-black uppercase tracking-[0.2em] text-slate-500">
          Mission Path Tracking
        </span>
        {distanceKm && (
            <span className="text-lg font-bold font-black text-primary ml-auto flex items-center gap-1.5">
                {distanceKm} KM <span className="opacity-40 tracking-tighter">REMAINING</span>
            </span>
        )}
      </div>

      {/* Route Visual Strip */}
      <div className="relative flex items-center gap-3 px-1 mb-6">
        {/* Origin dot */}
        <div className="relative">
            <div className="w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/10 shrink-0 shadow-[0_0_10px_rgba(255,30,133,0.5)]" />
            <div className="absolute -inset-1.5 bg-primary/20 rounded-full animate-ping" />
        </div>

        {/* Tactical Timeline */}
        <div className="flex-1 relative flex items-center h-4">
          <div className="absolute inset-x-0 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full w-full bg-gradient-to-r from-primary/10 via-primary/20 to-transparent" />
          </div>
          
          {(isInTransit || isCompleted) && (
            <div 
              className="absolute left-0 h-1 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,30,133,0.3)]"
              style={{ width: isCompleted ? '100%' : '45%' }}
            />
          )}

          {/* Intermediate Stops */}
          {isMultiStop && destinations.slice(0, -1).map((_, idx) => {
              const pos = ((idx + 1) / destinations.length) * 100;
              return (
                <div 
                    key={idx}
                    className="absolute w-2 h-2 rounded-full bg-white/10 border border-white/20 translate-x-[-50%]"
                    style={{ left: `${pos}%` }}
                />
              )
          })}

          {/* Animated Asset Indicator */}
          {isInTransit && (
            <div 
                className="absolute bg-primary p-1.5 rounded-xl border-2 border-[#0a0518] shadow-[0_0_20px_rgba(255,30,133,0.5)] -translate-x-1/2" 
                style={{ left: '42%' }}
            >
              <Truck size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Destination dot */}
        <div className={isCompleted 
            ? "w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/10 shrink-0 shadow-[0_0_10px_rgba(255,30,133,0.5)]" 
            : "w-3.5 h-3.5 rounded-full bg-white/10 border border-white/20 shrink-0"
        } />
      </div>

      {/* Location Labels */}
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-1">
          <p className="text-base font-bold font-black uppercase tracking-[0.2em] text-primary">Origin</p>
          <p className="text-base font-bold text-white font-bold leading-tight line-clamp-2">
            {origin || 'WAREHOUSE BASE'}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <p className="text-base font-bold font-black uppercase tracking-[0.2em] text-slate-500">Destination</p>
          <p className="text-base font-bold text-white font-bold leading-tight line-clamp-2">
            {destination || (isMultiStop ? destinations[destinations.length - 1].name : 'TACTICAL DROP')}
          </p>
        </div>
      </div>
    </div>
  )
}

