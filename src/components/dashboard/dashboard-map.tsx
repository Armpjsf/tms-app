"use client"

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

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

export function DashboardMap({ drivers, focusPosition, plannedRoute, routeSummary, sosDriverIds = [] }: DashboardMapProps) {
    const [currentTime] = useState<number>(() => Date.now())

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
                speed: (d as { Speed?: number }).Speed || 0,
                heading: (d as { Heading?: number }).Heading
            }))
    }, [drivers, currentTime, sosDriverIds])

    return (
        <div className="absolute inset-0 z-0">
            <LeafletMap 
                drivers={activeDrivers}
                height="100%"
                zoom={10}
                center={[13.7563, 100.5018]} // Default to Bangkok
                focusPosition={focusPosition}
                plannedRoute={plannedRoute}
            />
            {/* Map Overlay Badge */}
            <MapOverlay route={routeSummary} />
            
            {/* Subtle overlay to make cards more readable */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none backdrop-blur-[1px]" />
        </div>
    )
}
