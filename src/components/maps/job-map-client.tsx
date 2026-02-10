"use client"

import dynamic from 'next/dynamic'

// Dynamic import for Map to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Loading Route History...</div>
    </div>
  )
})

interface JobMapClientProps {
    routeHistory: [number, number][]
}

export default function JobMapClient({ routeHistory }: JobMapClientProps) {
    return (
        <div className="h-[400px] w-full relative">
            <LeafletMap 
                routeHistory={routeHistory}
                zoom={12}
                height="400px"
            />
        </div>
    )
}
