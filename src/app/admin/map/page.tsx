"use client"

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, RefreshCw } from "lucide-react"
import type { DriverLocation } from '@/components/maps/leaflet-map'
import { getLatestDriverLocations } from '@/lib/supabase/gps'

// Dynamic import to avoid SSR issues with Leaflet
const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Loading Map...</div>
    </div>
  )
})

export default function AdminMapPage() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([])
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | undefined>(undefined)

  const fetchDriverLocations = async () => {
    setIsLoading(true)
    try {
      const logs = await getLatestDriverLocations()
      
      const mappedDrivers: DriverLocation[] = logs.map((log: any) => ({
        id: log.Driver_ID,
        name: log.Driver_Name || 'Unknown Driver',
        lat: log.Latitude,
        lng: log.Longitude,
        status: new Date(log.Timestamp).getTime() > Date.now() - 5 * 60 * 1000 ? 'Active' : 'Idle',
        speed: log.Speed || 0,
        lastUpdate: new Date(log.Timestamp).toLocaleTimeString('th-TH')
      }))

      setDrivers(mappedDrivers)
      setLastRefresh(new Date().toLocaleTimeString('th-TH'))
    } catch (error) {
      console.error('Failed to fetch driver locations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDriverLocations()
    const interval = setInterval(fetchDriverLocations, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Live Tracking</h1>
          <p className="text-slate-400">ติดตามตำแหน่งรถแบบ Real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">Last update: {lastRefresh}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDriverLocations}
            disabled={isLoading}
            className="border-slate-700 bg-slate-900"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <LeafletMap 
              drivers={drivers} 
              height="500px" 
              zoom={11}
              focusPosition={focusedLocation}
            />
          </Card>
        </div>

        {/* Driver List */}
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-400" />
                Active Drivers ({drivers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {drivers.map((driver) => (
                <div 
                  key={driver.id}
                  className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer"
                  onClick={() => setFocusedLocation([driver.lat, driver.lng])}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{driver.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      driver.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {driver.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>Speed: {driver.speed} km/h</span>
                    <span>{driver.lastUpdate}</span>
                  </div>
                </div>
              ))}
              {drivers.length === 0 && (
                <p className="text-center text-slate-500 py-4">No active drivers</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
