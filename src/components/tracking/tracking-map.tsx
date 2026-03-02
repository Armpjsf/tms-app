"use client"

import dynamicImport from 'next/dynamic'
import { MapPin } from "lucide-react"

// Dynamically import LeafletMap to avoid SSR issues with 'window'
const LeafletMap = dynamicImport(() => import('@/components/maps/leaflet-map'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">กำลังโหลดแผนที่...</div>
})

interface TrackingMapProps {
  lastLocation: {
    lat: number
    lng: number
    timestamp: string
  }
  driverName: string
  status: string
}

export function TrackingMap({ lastLocation, driverName, status }: TrackingMapProps) {
  return (
    <LeafletMap 
        center={[lastLocation.lat, lastLocation.lng]}
        zoom={15}
        focusPosition={[lastLocation.lat, lastLocation.lng]}
        drivers={[{
            id: driverName,
            name: driverName,
            lat: lastLocation.lat,
            lng: lastLocation.lng,
            status: status,
            lastUpdate: new Date(lastLocation.timestamp).toLocaleTimeString('th-TH')
        }]}
    />
  )
}
