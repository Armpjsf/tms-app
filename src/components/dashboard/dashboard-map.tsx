"use client"

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, Activity, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
      <div className="text-emerald-500 animate-pulse font-medium">Initializing Live Fleet Map...</div>
    </div>
  )
})

interface DashboardMapProps {
    drivers: {
        Driver_ID: string
        Driver_Name: string
        Vehicle_Plate: string
        Last_Update: string | null
        Latitude: number | null
        Longitude: number | null
    }[]
    allJobs?: any[]
    focusPosition?: [number, number]
    plannedRoute?: { lat: number; lng: number; name: string; type: 'start' | 'stop' | 'end' }[]
    routeSummary?: {
        start: string
        end: string
        target: string
        eta?: string
        distance?: string
    } | null
    sosDriverIds?: (string | null)[]
}

import { MapOverlay } from './map-overlay'

export function DashboardMap({ drivers, allJobs = [], focusPosition, plannedRoute, routeSummary, sosDriverIds = [] }: DashboardMapProps) {
    const [currentTime] = useState<number>(() => Date.now())
    const [showHeatmap, setShowHeatmap] = useState(false)

    // Map fleetStatus to LeafletMap's DriverLocation format
    const activeDrivers = useMemo(() => {
        const tenMinutes = 600000 // Consistent with MonitoringCommandCenter
        
        return drivers
            .filter(d => d.Latitude !== null && d.Longitude !== null)
            .map(d => ({
                id: d.Driver_ID,
                name: d.Driver_Name,
                lat: d.Latitude!,
                lng: d.Longitude!,
                status: sosDriverIds.includes(d.Driver_ID) ? 'SOS' : (d.Last_Update ? (new Date(d.Last_Update).getTime() > currentTime - tenMinutes ? 'Online' : 'Offline') : 'Offline'),
                vehicle: d.Vehicle_Plate,
                vehiclePlate: d.Vehicle_Plate,
                speed: (d as { Speed?: number }).Speed || 0,
                heading: (d as { Heading?: number }).Heading
            }))
    }, [drivers, currentTime, sosDriverIds])

    // Generate Profit Points for Heatmap
    const profitPoints = useMemo(() => {
        return allJobs
            .filter(j => j.Delivery_Lat && j.Delivery_Lon)
            .map(j => ({
                lat: j.Delivery_Lat,
                lng: j.Delivery_Lon,
                profit: (j.Price_Cust_Total || 0) - (j.Cost_Driver_Total || 0)
            }))
    }, [allJobs])

    return (
        <div className="absolute inset-0 z-0">
            <LeafletMap 
                drivers={activeDrivers}
                height="100%"
                zoom={10}
                center={[13.7563, 100.5018]} // Default to Bangkok
                focusPosition={focusPosition}
                plannedRoute={plannedRoute}
                profitPoints={profitPoints}
                showHeatmap={showHeatmap}
            />

            {/* Map Mode Toggle */}
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={cn(
                        "h-10 px-4 rounded-xl border font-black uppercase tracking-tighter transition-all shadow-2xl",
                        showHeatmap 
                            ? "bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 scale-105" 
                            : "bg-white/90 backdrop-blur-md border-gray-200 text-slate-700 hover:bg-white"
                    )}
                >
                    {showHeatmap ? (
                        <>
                            <Activity className="mr-2 h-4 w-4" />
                            Live Fleet
                        </>
                    ) : (
                        <>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Profit Heatmap
                        </>
                    )}
                </Button>
            </div>

            {/* Map Overlay Badge */}
            <MapOverlay route={routeSummary} />
            
            {/* Subtle overlay to make cards more readable */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        </div>
    )
}
