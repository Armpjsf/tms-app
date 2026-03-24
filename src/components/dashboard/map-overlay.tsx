"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { MapPin, Navigation, Clock } from "lucide-react"

interface MapOverlayProps {
    route?: {
        start: string
        end: string
        target: string
        eta?: string
        distance?: string
    } | null
}

export const MapOverlay = memo(function MapOverlay({ route }: MapOverlayProps) {
    if (!route) return null

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-sm px-4">
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-6 pointer-events-auto"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Navigation className="text-white w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-base font-bold font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Active Route</p>
                        <h4 className="text-xl font-black text-gray-900 leading-none">
                            {route.start} ➔ {route.end}
                        </h4>
                    </div>
                </div>

                <div className="h-10 w-px bg-gray-100" />

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        {route.eta && (
                            <div className="flex items-center gap-1 justify-end text-emerald-700 font-black text-xl mb-0.5">
                                <Clock size={12} />
                                ETA: {route.eta}
                            </div>
                        )}
                        {route.distance && (
                            <p className="text-base font-bold font-bold text-gray-500 uppercase tracking-tighter">{route.distance} Remaining</p>
                        )}
                        {!route.eta && !route.distance && (
                            <p className="text-base font-bold font-bold text-emerald-600 uppercase tracking-widest">Optimized</p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Floating destination badge */}
            {route.target && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-white/10"
                >
                    <MapPin size={10} className="text-emerald-400" />
                    <span className="text-base font-bold font-black uppercase tracking-widest italic truncate max-w-[200px]">
                        Target: {route.target}
                    </span>
                </motion.div>
            )}
        </div>
    )
})

