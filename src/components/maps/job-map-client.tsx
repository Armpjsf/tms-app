"use client"

import dynamic from 'next/dynamic'

// Dynamic import for Map to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-muted-foreground animate-pulse">Loading Route History...</div>
    </div>
  )
})

interface JobMapClientProps {
    routeHistory: [number, number][]
    pickup?: { lat: number | null, lng: number | null, name: string }
    dropoff?: { lat: number | null, lng: number | null, name: string }
    status?: string
}

export default function JobMapClient({ routeHistory, pickup, dropoff, status }: JobMapClientProps) {
    const jobMissions = []
  
    if (pickup?.lat && pickup?.lng) {
        jobMissions.push({
            id: 'origin',
            jobId: 'detail',
            name: pickup.name,
            lat: pickup.lat,
            lng: pickup.lng,
            type: 'origin' as const,
            status: status || 'Pending'
        })
    }

    if (dropoff?.lat && dropoff?.lng) {
        jobMissions.push({
            id: 'destination',
            jobId: 'detail',
            name: dropoff.name,
            lat: dropoff.lat,
            lng: dropoff.lng,
            type: 'destination' as const,
            status: status || 'Pending'
        })
    }

    return (
        <div className="h-[400px] w-full relative">
            <LeafletMap 
                routeHistory={routeHistory}
                zoom={12}
                height="400px"
                jobMissions={jobMissions}
            />
        </div>
    )
}
