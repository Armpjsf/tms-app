"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

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
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(position, map.getZoom())
  }, [map, position])
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
  routeHistory = []
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {drivers.map((driver) => (
        <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={driverIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{driver.name}</p>
              <p className="text-gray-600">Status: {driver.status || 'Active'}</p>
              {driver.speed !== undefined && <p className="text-gray-600">Speed: {driver.speed} km/h</p>}
              {driver.lastUpdate && <p className="text-gray-500 text-xs">Updated: {driver.lastUpdate}</p>}
            </div>
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
