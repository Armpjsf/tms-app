"use client"

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { MapPin, Navigation, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Loading Map...</div>
    </div>
  )
})

export default function MobileMapPage() {
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition([position.coords.latitude, position.coords.longitude])
        setIsLoading(false)
      },
      (error) => {
        setLocationError(error.message)
        setIsLoading(false)
      },
      { enableHighAccuracy: true }
    )

    // Watch position for updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition([position.coords.latitude, position.coords.longitude])
      },
      undefined,
      { enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const openGoogleMaps = () => {
    if (currentPosition) {
      const url = `https://www.google.com/maps?q=${currentPosition[0]},${currentPosition[1]}`
      window.open(url, '_blank')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-white">Navigation</h1>
      
      {/* Map */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center bg-slate-800">
            <p className="text-slate-400 animate-pulse">Getting your location...</p>
          </div>
        ) : locationError ? (
          <div className="h-64 flex items-center justify-center bg-slate-800">
            <p className="text-red-400">Error: {locationError}</p>
          </div>
        ) : currentPosition ? (
          <LeafletMap 
            currentPosition={currentPosition}
            showCurrentPosition={true}
            height="256px"
            zoom={15}
          />
        ) : null}
      </Card>

      {/* Current Location Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPosition ? (
            <>
              <p className="text-white font-medium">ตำแหน่งปัจจุบัน</p>
              <p className="text-xs text-slate-500 mt-1">
                Lat: {currentPosition[0].toFixed(6)}, Lng: {currentPosition[1].toFixed(6)}
              </p>
            </>
          ) : (
            <p className="text-slate-500">กำลังระบุตำแหน่ง...</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={openGoogleMaps}
          disabled={!currentPosition}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in Google Maps
        </Button>
      </div>

      {/* Next Destination */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400" />
            Next Destination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white font-medium">ไม่มีงานวันนี้</p>
          <p className="text-xs text-slate-500 mt-1">รอรับงานจากระบบ</p>
        </CardContent>
      </Card>
    </div>
  )
}
