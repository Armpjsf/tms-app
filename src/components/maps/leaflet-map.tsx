"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const driverIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const startIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
  
  const endIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
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
  focusPosition
}: LeafletMapProps) {
  const mapCenter = currentPosition || (routeHistory.length > 0 ? routeHistory[0] : center)

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

      {drivers.map((driver) => (
        <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={driverIcon}>
          <Popup>
             <DriverPopup driver={driver} />
          </Popup>
        </Marker>
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
    </MapContainer>
  )
}

function DriverPopup({ driver }: { driver: DriverLocation }) {
  const [address, setAddress] = useState<string>('Loading address...')

  useEffect(() => {
    let isMounted = true
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${driver.lat}&lon=${driver.lng}&zoom=14&addressdetails=1`, {
          headers: { 'User-Agent': 'TMS-ePOD/1.0' }
        })
        const data = await res.json()
        
        if (isMounted) {
            const addr = data.address
            if (addr) {
                const district = addr.city_district || addr.district || addr.suburb || ''
                const province = addr.province || addr.state || ''
                const road = addr.road || ''
                setAddress(`${road} ${district} ${province}`.trim() || 'Address not found')
            } else {
                setAddress('Address not found')
            }
        }
      } catch {
        if (isMounted) setAddress('Address lookup failed')
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
