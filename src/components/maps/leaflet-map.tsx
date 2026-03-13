"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef } from 'react'

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const driverIcon = L.icon({
  iconUrl: '/images/map/truck-marker.png',
  shadowUrl: undefined,
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -15]
})

const startIcon = L.icon({
    iconUrl: '/images/map/start-marker.png',
    shadowUrl: undefined,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
})
  
const endIcon = L.icon({
    iconUrl: '/images/map/end-marker.png',
    shadowUrl: undefined,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
})

L.Marker.prototype.options.icon = defaultIcon

export type DriverLocation = {
  id: string
  name: string
  lat: number
  lng: number
  status?: string
  lastUpdate?: string
  speed?: number
  heading?: number
}

type LeafletMapProps = {
  center?: [number, number]
  zoom?: number
  drivers?: DriverLocation[]
  currentPosition?: [number, number]
  height?: string
  showCurrentPosition?: boolean
  routeHistory?: [number, number][]
  focusPosition?: [number, number]
  plannedRoute?: { lat: number; lng: number; name: string; type: 'start' | 'stop' | 'end' }[]
}

function RecenterMap({ position, zoom }: { position: [number, number], zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, zoom || map.getZoom())
  }, [map, position, zoom])
  return null
}

function FitBounds({ route }: { route: [number, number][] }) {
    const map = useMap()
    useEffect(() => {
      if (route.length > 0) {
        const bounds = L.latLngBounds(route.map(pos => L.latLng(pos[0], pos[1])))
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }, [map, route])
    return null
  }

export default function LeafletMap({
  center = [13.7563, 100.5018],
  zoom = 12,
  drivers = [],
  currentPosition,
  height = "400px",
  showCurrentPosition = false,
  routeHistory = [],
  focusPosition,
  plannedRoute = []
}: LeafletMapProps) {
  const mapCenter = currentPosition || (routeHistory.length > 0 ? routeHistory[0] : (plannedRoute.length > 0 ? [plannedRoute[0].lat, plannedRoute[0].lng] : center)) as [number, number]

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '0.5rem' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; Google Maps'
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
      />

      {drivers.filter(d => isFinite(d.lat) && isFinite(d.lng)).map((driver) => (
        <MovingMarker key={driver.id} driver={driver} />
      ))}

      {showCurrentPosition && currentPosition && (
        <>
          <RecenterMap position={currentPosition} />
          <Marker position={currentPosition} icon={defaultIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold">Your Location</p>
                <p className="text-gray-600">{currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        </>
      )}

      {focusPosition && <RecenterMap position={focusPosition} zoom={16} />}

      {routeHistory.length > 0 && (
        <>
            <Polyline positions={routeHistory} color="blue" weight={4} opacity={0.7} />
            <Marker position={routeHistory[0]} icon={startIcon}>
                <Popup>Start Point</Popup>
            </Marker>
            <Marker position={routeHistory[routeHistory.length - 1]} icon={endIcon}>
                <Popup>End Point</Popup>
            </Marker>
            <FitBounds route={routeHistory} />
        </>
      )}

      {plannedRoute.length > 0 && (
        <>
            <Polyline 
                positions={plannedRoute.map(p => [p.lat, p.lng] as [number, number])} 
                color="#10b981" 
                weight={6} 
                opacity={0.4} 
                dashArray="10, 10"
            />
            {plannedRoute.map((p, i) => (
                <Marker 
                    key={`${p.lat}-${p.lng}-${i}`} 
                    position={[p.lat, p.lng]} 
                    icon={p.type === 'start' ? startIcon : p.type === 'end' ? endIcon : defaultIcon}
                >
                    <Popup>
                        <div className="font-bold">{p.type.toUpperCase()}: {p.name}</div>
                    </Popup>
                </Marker>
            ))}
            <FitBounds route={plannedRoute.map(p => [p.lat, p.lng])} />
        </>
      )}
    </MapContainer>
  )
}

function MovingMarker({ driver }: { driver: DriverLocation }) {
  const [currentPos, setCurrentPos] = useState<[number, number]>([driver.lat, driver.lng])
  const lastPosRef = useRef<[number, number]>([driver.lat, driver.lng])
  const [heading, setHeading] = useState<number>(driver.heading || 0)

  useEffect(() => {
    let animationFrame: number
    const startPos = lastPosRef.current
    const targetPos: [number, number] = [driver.lat, driver.lng]
    const duration = 1500 // 1.5 second animation
    const startTime = performance.now()

    // Calculate heading if not provided
    if (driver.heading === undefined && (startPos[0] !== targetPos[0] || startPos[1] !== targetPos[1])) {
        const y = Math.sin((targetPos[1] - startPos[1]) * (Math.PI / 180)) * Math.cos(targetPos[0] * (Math.PI / 180))
        const x = Math.cos(startPos[0] * (Math.PI / 180)) * Math.sin(targetPos[0] * (Math.PI / 180)) -
                  Math.sin(startPos[0] * (Math.PI / 180)) * Math.cos(targetPos[0] * (Math.PI / 180)) * Math.cos((targetPos[1] - startPos[1]) * (Math.PI / 180))
        let bearing = Math.atan2(y, x) * (180 / Math.PI)
        bearing = (bearing + 360) % 360
        setHeading(bearing)
    } else if (driver.heading !== undefined) {
        setHeading(driver.heading)
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const lat = startPos[0] + (targetPos[0] - startPos[0]) * progress
      const lng = startPos[1] + (targetPos[1] - startPos[1]) * progress
      
      setCurrentPos([lat, lng])

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        lastPosRef.current = targetPos
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animationFrame)
      lastPosRef.current = targetPos
    }
  }, [driver.lat, driver.lng, driver.heading])

  return (
    <Marker 
        position={currentPos} 
        icon={L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative flex items-center justify-center" style="width: 50px; height: 50px;">
                    <!-- Direction Aura / Shadow -->
                    <div class="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse border border-emerald-500/20" 
                         style="transform: scale(1.2) rotate(${heading}deg); transition: transform 0.5s ease-out;">
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                    </div>

                    <!-- Marker Body -->
                    <div class="relative flex items-center justify-center p-2 bg-slate-950 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10"
                         style="transform: rotate(${heading}deg); transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">
                        
                        <!-- SOS Pulse if active -->
                        ${driver.status === 'SOS' ? '<div class="absolute inset-0 bg-red-500/40 rounded-xl animate-ping"></div>' : ''}
                        
                        <!-- Premium Truck Icon -->
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="${driver.status === 'SOS' ? 'text-red-500' : 'text-emerald-400'} relative z-10">
                            <path d="M1 14H17M1 14L2 7H14L17 14M1 14V18H3M17 14V18H15M17 14H23V18H21M17 11H21L23 14M7 18C7 19.1046 6.10457 20 5 20C3.89543 20 3 19.1046 3 18C3 16.8954 3.89543 16 5 18ZM7 18C7 16.8954 7.89543 16 9 16C10.1046 16 11 16.8954 11 18M11 18C11 19.1046 10.1046 20 9 20C7.89543 20 7 19.1046 7 18ZM19 18C19 19.1046 18.1046 20 17 20C15.8954 20 15 19.1046 15 18C15 16.8954 15.8954 16 17 16C18.1046 16 19 16.8954 19 18ZM21 18C21 19.1046 20.1046 20 19 20C17.8954 20 17 19.1046 17 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>

                    <!-- Online/Status Badge -->
                    <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${driver.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-slate-500'} z-20"></div>
                </div>
            `,
            iconSize: [50, 50],
            iconAnchor: [25, 25],
            popupAnchor: [0, -20]
        })}
    >
      <Popup>
         <DriverPopup driver={{ ...driver, lat: currentPos[0], lng: currentPos[1], heading }} />
      </Popup>
    </Marker>
  )
}

function DriverPopup({ driver }: { driver: DriverLocation }) {
  const [address, setAddress] = useState<string>('Loading address...')

  useEffect(() => {
    let isMounted = true
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${driver.lat}&lon=${driver.lng}&zoom=14&addressdetails=1`, {
          headers: { 'User-Agent': 'TMS-ePOD/1.0' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        if (!res.ok) throw new Error('API Response Error')
        const data = await res.json()
        
        if (isMounted) {
            const addr = data.address
            if (addr) {
                const district = addr.city_district || addr.district || addr.suburb || ''
                const province = addr.province || addr.state || ''
                const road = addr.road || ''
                setAddress(`${road} ${district} ${province}`.trim() || 'Address found (no details)')
            } else {
                setAddress('Address not found')
            }
        }
      } catch (err) {
        console.warn('Map geocoding failed:', err)
        if (isMounted) setAddress('Location services unavailable')
      }
    }

    fetchAddress()
    return () => { isMounted = false }
  }, [driver.lat, driver.lng])

  return (
    <div className="text-sm min-w-[200px]">
      <p className="font-bold text-base mb-1">{driver.name}</p>
      <div className="space-y-1">
        <p className="text-gray-700 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${driver.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          {driver.status || 'Active'}
        </p>
        {driver.speed !== undefined && <p className="text-gray-600">Speed: {driver.speed} km/h</p>}
        <p className="text-gray-500 text-xs">
          {driver.lat.toFixed(6)}, {driver.lng.toFixed(6)}
        </p>
        <div className="pt-2 border-t border-gray-100 mt-2">
            <p className="text-gray-500 text-xs font-semibold">Location:</p>
            <p className="text-gray-700 text-xs leading-relaxed">
                {address}
            </p>
        </div>
        {driver.lastUpdate && <p className="text-gray-400 text-[10px] mt-1 text-right">Updated: {driver.lastUpdate}</p>}
      </div>
    </div>
  )
}
