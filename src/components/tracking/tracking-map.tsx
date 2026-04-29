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
  pickup?: { lat: number | null, lng: number | null, name: string }
  dropoff?: { lat: number | null, lng: number | null, name: string }
}

export function TrackingMap({ lastLocation, driverName, status, pickup, dropoff }: TrackingMapProps) {
  const jobMissions = []
  
  if (pickup?.lat && pickup?.lng) {
    jobMissions.push({
        id: 'origin',
        jobId: 'tracking',
        name: pickup.name,
        lat: pickup.lat,
        lng: pickup.lng,
        type: 'origin' as const,
        status: status
    })
  }

  if (dropoff?.lat && dropoff?.lng) {
    jobMissions.push({
        id: 'destination',
        jobId: 'tracking',
        name: dropoff.name,
        lat: dropoff.lat,
        lng: dropoff.lng,
        type: 'destination' as const,
        status: status
    })
  }

  return (
    <LeafletMap 
        center={[lastLocation.lat, lastLocation.lng]}
        zoom={15}
        focusPosition={[lastLocation.lat, lastLocation.lng]}
        jobMissions={jobMissions}
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
