"use client"

import dynamicImport from 'next/dynamic'
import { MapPin, NavigationOff } from "lucide-react"

// Dynamically import LeafletMap to avoid SSR issues with 'window'
const LeafletMap = dynamicImport(() => import('@/components/maps/leaflet-map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted/40 animate-pulse flex items-center justify-center text-muted-foreground font-medium text-sm">กำลังโหลดข้อมูลแผนที่...</div>
})

interface TrackingMapProps {
  lastLocation?: {
    lat: number
    lng: number
    timestamp: string
  } | null
  driverName: string
  status: string
  pickup?: { lat: number | null, lng: number | null, name: string }
  dropoff?: { lat: number | null, lng: number | null, name: string }
  vehiclePlate?: string
}

export function TrackingMap({ lastLocation, driverName, status, pickup, dropoff, vehiclePlate }: TrackingMapProps) {
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

  // Determine fallback center (e.g., Destination or Pickup or Thailand Default)
  const defaultCenter: [number, number] = [13.7563, 100.5018] // Bangkok
  const centerLat = lastLocation?.lat ?? dropoff?.lat ?? pickup?.lat ?? defaultCenter[0]
  const centerLng = lastLocation?.lng ?? dropoff?.lng ?? pickup?.lng ?? defaultCenter[1]

  // งานที่เสร็จแล้ว/ไม่มี GPS สด lastLocation อาจเป็น object ที่ lat/lng = null
  // → ต้องเข้า fallback path (ไม่งั้นส่ง [null,null] ให้ Leaflet แล้ว crash)
  const hasLiveLocation = !!lastLocation
    && lastLocation.lat != null && lastLocation.lng != null
    && Number.isFinite(Number(lastLocation.lat)) && Number.isFinite(Number(lastLocation.lng))

  if (!hasLiveLocation) {
    return (
        <div className="relative h-full w-full">
            <LeafletMap
                center={[centerLat, centerLng]}
                zoom={12}
                jobMissions={jobMissions}
                drivers={[]}
            />
            <div className="absolute inset-0 z-[1000] pointer-events-none flex flex-col items-center justify-center bg-background/50 backdrop-blur-[2px]">
                <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                        <NavigationOff size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">ไม่มีพิกัด GPS สด</p>
                        <p className="text-xs text-muted-foreground mt-1">ขณะนี้คนขับยังไม่ได้เปิดการแชร์พิกัด</p>
                    </div>
                </div>
            </div>
        </div>
    )
  }

  const loc = lastLocation!
  return (
    <LeafletMap
        center={[loc.lat, loc.lng]}
        zoom={15}
        focusPosition={[loc.lat, loc.lng]}
        jobMissions={jobMissions}
        drivers={[{
            id: driverName,
            name: driverName,
            lat: loc.lat,
            lng: loc.lng,
            status: status,
            lastUpdate: loc.timestamp ? new Date(loc.timestamp).toLocaleTimeString('th-TH') : '',
            vehiclePlate: vehiclePlate || "N/A"
        }]}
    />
  )
}
