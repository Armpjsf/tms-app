"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Box, 
  Weight, 
  Maximize2
} from "lucide-react"

export interface CargoCapacityProps {
    stats?: {
        totalCapacity: number
        usedCapacity: number
        unit: string
        vehicleType: string
        plate: string
    } | null
}


export function CargoCapacity({ stats }: CargoCapacityProps) {
    if (!stats) return null
    const displayStats = stats
    const percentage = (displayStats.usedCapacity / displayStats.totalCapacity) * 100
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Truck className="text-emerald-500" size={20} />
                        Cargo Utilization
                    </h3>
                    <p className="text-gray-800 font-bold">Real-time load factor monitoring</p>
                </div>
            </div>

            <div className="bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 p-4 lg:p-8 relative overflow-hidden group">
                {/* 3D-like Effect Background */}
                <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                    <Box size={180} className="text-emerald-600" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-8">
                    {/* The "Truck Visual" - High Fidelity SVG */}
                    <div className="w-full max-w-[400px] aspect-[2/1] relative group/truck">
                        <svg viewBox="0 0 400 200" className="w-full h-full drop-shadow-2xl">
                            {/* Definition for the Truck Shape Mask */}
                            <defs>
                                <clipPath id="truck-bed-clip">
                                    <rect x="20" y="40" width="280" height="100" rx="8" />
                                </clipPath>
                                <linearGradient id="load-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#34d399" />
                                </linearGradient>
                            </defs>

                            {/* Truck Body (Gray Outline/Base) */}
                            <g className="fill-gray-100 stroke-gray-300 transition-colors duration-500 group-hover/truck:fill-gray-50" strokeWidth="2">
                                {/* Cab */}
                                <path d="M300 140 L380 140 L380 100 Q380 80 350 80 L300 80 Z" />
                                {/* Bottom Chassis */}
                                <rect x="20" y="140" width="350" height="15" rx="4" />
                                {/* Wheels */}
                                <circle cx="80" cy="165" r="18" fill="#1e293b" stroke="none" />
                                <circle cx="140" cy="165" r="18" fill="#1e293b" stroke="none" />
                                <circle cx="330" cy="165" r="18" fill="#1e293b" stroke="none" />
                                
                                {/* Bed Outline */}
                                <rect x="20" y="40" width="280" height="100" rx="8" fill="none" strokeWidth="4" />
                            </g>

                            {/* Dynamic Load FILL */}
                            <motion.rect 
                                initial={{ width: 0 }}
                                animate={{ width: (280 * percentage) / 100 }}
                                transition={{ duration: 2, ease: "circOut" }}
                                x="20" y="40" height="100"
                                fill="url(#load-gradient)"
                                clipPath="url(#truck-bed-clip)"
                                className="opacity-90"
                            />

                            {/* Load Texture/Grid */}
                            <rect x="20" y="40" width="280" height="100" fill="url(#pattern-load)" opacity="0.1" clipPath="url(#truck-bed-clip)" />
                            
                            <defs>
                                <pattern id="pattern-load" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                                </pattern>
                            </defs>
                        </svg>

                        {/* Centered Percentage Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-5xl font-black text-gray-900 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                                    {Math.round(percentage)}%
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-100 italic">
                                    LOAD FACTOR
                                </span>
                            </motion.div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 lg:gap-8 w-full">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                <Weight size={10} />
                                Occupied
                            </p>
                            <p className="text-xl lg:text-2xl font-black text-gray-900 leading-none">
                                {displayStats.usedCapacity.toLocaleString()} <span className="text-xs font-bold text-gray-600">{displayStats.unit}</span>
                            </p>
                        </div>
                        <div className="space-y-1 border-l border-gray-100 pl-4 lg:pl-8">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                <Maximize2 size={10} />
                                Capacity
                            </p>
                            <p className="text-xl lg:text-2xl font-black text-gray-900 leading-none">
                                {displayStats.totalCapacity.toLocaleString()} <span className="text-xs font-bold text-gray-600">{displayStats.unit}</span>
                            </p>
                        </div>
                    </div>

                    <div className="w-full p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                <Truck size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{displayStats.plate}</p>
                                <p className="text-sm font-bold text-gray-900">{displayStats.vehicleType}</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-500 text-white border-0 font-black">ACTIVE</Badge>
                    </div>
                </div>
            </div>
            
            <p className="text-[10px] text-center text-gray-500 font-bold">Data synced with IoT weight sensors every 60 seconds</p>
        </div>
    )
}
