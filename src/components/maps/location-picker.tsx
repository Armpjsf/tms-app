"use client"

/**
 * LocationPicker — TMS 2026
 * Google-Maps-style location picker modal, built entirely on free/open stacks
 * (no Google Places / paid API):
 *   - Autocomplete search via Photon (photon.komoot.io) — no API key needed,
 *     biased to Thailand for better local suggestions.
 *   - Interactive Leaflet map: click anywhere or drag the marker to pick a point.
 *   - Reverse geocode (Nominatim) fills the place name automatically.
 *
 * On confirm it returns { name, lat, lng } so the caller can drop the values
 * straight into an origin / destination row.
 */

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Search as SearchIcon, Check, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'

// Thailand centroid — sensible default view when no point is chosen yet.
const TH_CENTER: [number, number] = [13.7563, 100.5018]
// Thailand bounding box [minLon, minLat, maxLon, maxLat] — used to constrain
// autocomplete so it stops suggesting places on the other side of the planet.
const TH_BBOX = { minLon: 97.3, minLat: 5.5, maxLon: 105.7, maxLat: 20.6 }

const pinIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type PhotonFeature = {
  geometry: { coordinates: [number, number] } // [lng, lat]
  properties: {
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    countrycode?: string
  }
}

type Suggestion = {
  label: string
  lat: number
  lng: number
}

export type PickedLocation = { name: string; lat: number; lng: number }

type LocationPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialLat?: string | number
  initialLng?: string | number
  initialName?: string
  onConfirm: (loc: PickedLocation) => void
  title?: string
}

// Build a readable Thai-friendly label from a Photon feature.
function labelFromFeature(f: PhotonFeature): string {
  const p = f.properties
  const parts = [
    p.name,
    [p.housenumber, p.street].filter(Boolean).join(' '),
    p.district,
    p.city || p.county,
    p.state,
  ].filter(Boolean)
  // De-dup consecutive equal parts (Photon sometimes repeats name === city)
  const out: string[] = []
  for (const part of parts) {
    if (out[out.length - 1] !== part) out.push(part as string)
  }
  return out.join(', ')
}

function RecenterOnPoint({ point }: { point: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (point && map && typeof map.getContainer === 'function') {
      const c = map.getContainer()
      if (c && document.body.contains(c)) map.setView(point, Math.max(map.getZoom(), 15), { animate: true })
    }
  }, [point, map])
  return null
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

// Fixes the common "grey tiles" bug when a Leaflet map mounts inside a dialog
// that animates/opens after the map — force a size recalculation on mount.
function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export default function LocationPicker({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  initialName,
  onConfirm,
  title = 'เลือกตำแหน่งบนแผนที่',
}: LocationPickerProps) {
  const parsedLat = initialLat != null && initialLat !== '' ? Number(initialLat) : NaN
  const parsedLng = initialLng != null && initialLng !== '' ? Number(initialLng) : NaN
  const hasInitial = !Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [showList, setShowList] = useState(false)
  const [point, setPoint] = useState<[number, number] | null>(hasInitial ? [parsedLat, parsedLng] : null)
  const [name, setName] = useState(initialName || '')
  const [reverseLoading, setReverseLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Reset state each time the dialog is (re)opened for a specific row.
  useEffect(() => {
    if (open) {
      setQuery(initialName || '')
      setName(initialName || '')
      setPoint(hasInitial ? [parsedLat, parsedLng] : null)
      setSuggestions([])
      setShowList(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reverse geocode a picked point → place name (Nominatim, best effort).
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=th`,
        { headers: { 'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' }, signal: AbortSignal.timeout(6000) }
      )
      if (!res.ok) return
      const data = await res.json()
      const label = (data?.name && String(data.name).trim()) || (data?.display_name && String(data.display_name).trim())
      if (label) setName(label)
    } catch {
      /* keep whatever name we had */
    } finally {
      setReverseLoading(false)
    }
  }, [])

  // Photon autocomplete, debounced.
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setSearching(true)
      try {
        // Photon: bias to Thailand centre AND clip to the Thailand bbox, then
        // keep only TH results — this is what stops the flood of foreign places.
        const bbox = `${TH_BBOX.minLon},${TH_BBOX.minLat},${TH_BBOX.maxLon},${TH_BBOX.maxLat}`
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=default` +
          `&lat=${TH_CENTER[0]}&lon=${TH_CENTER[1]}&bbox=${bbox}`
        const res = await fetch(url, { signal: ctrl.signal })
        let results: Suggestion[] = []
        if (res.ok) {
          const data = await res.json()
          const feats: PhotonFeature[] = data?.features || []
          results = feats
            // Only keep Thai results (Photon has no countrycodes filter param).
            .filter((f) => !f.properties.countrycode || f.properties.countrycode.toUpperCase() === 'TH')
            .map((f) => ({
              label: labelFromFeature(f),
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            }))
            .filter((s) => s.label)
        }

        // Fallback: if Photon found little inside Thailand, ask Nominatim which
        // DOES support a hard country filter (countrycodes=th) and is strong on
        // Thai company / landmark names.
        if (results.length < 3) {
          try {
            const nres = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=th&accept-language=th&addressdetails=1`,
              { headers: { 'User-Agent': 'TMS-Logistics-Platform-v2 (contact@logispro-epod.app)' }, signal: ctrl.signal }
            )
            if (nres.ok) {
              const ndata: Array<{ lat: string; lon: string; display_name: string; name?: string }> = await nres.json()
              const seenLabels = new Set(results.map((r) => r.label))
              for (const n of ndata) {
                const label = (n.name && n.name.trim()) || n.display_name
                if (!label || seenLabels.has(label)) continue
                seenLabels.add(label)
                results.push({ label, lat: parseFloat(n.lat), lng: parseFloat(n.lon) })
              }
            }
          } catch { /* keep Photon results */ }
        }

        setSuggestions(results.slice(0, 8))
        setShowList(true)
      } catch {
        /* ignore */
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open])

  const pickSuggestion = (s: Suggestion) => {
    setPoint([s.lat, s.lng])
    setName(s.label)
    setQuery(s.label)
    setShowList(false)
    setSuggestions([])
  }

  const pickOnMap = (lat: number, lng: number) => {
    setPoint([lat, lng])
    reverseGeocode(lat, lng)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => pickOnMap(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const confirm = () => {
    if (!point) return
    onConfirm({ name: name.trim(), lat: point[0], lng: point[1] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <MapPin className="w-5 h-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search box + autocomplete */}
        <div className="px-5 relative z-[1200]">
          <div className="relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowList(true)}
              placeholder="พิมพ์ชื่อสถานที่ / ที่อยู่ (เช่น นิคมนวนคร, เซ็นทรัลลาดพร้าว)"
              className="pl-10 pr-10 h-12 text-base"
            />
            {searching && <Loader2 className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {showList && suggestions.length > 0 && (
            <ul className="absolute left-5 right-5 mt-1 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent flex items-start gap-2.5 transition-colors"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-sm leading-snug">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Map */}
        <div className="relative mt-3 h-[380px] w-full">
          <MapContainer center={point || TH_CENTER} zoom={point ? 15 : 6} style={{ height: '100%', width: '100%' }} className="z-0">
            <InvalidateOnMount />
            <TileLayer attribution="&copy; Google Maps" url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
            <ClickCapture onPick={pickOnMap} />
            <RecenterOnPoint point={point} />
            {point && (
              <Marker
                position={point}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker
                    const ll = m.getLatLng()
                    pickOnMap(ll.lat, ll.lng)
                  },
                }}
              />
            )}
          </MapContainer>

          <button
            type="button"
            onClick={useMyLocation}
            title="ใช้ตำแหน่งปัจจุบัน"
            className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-background/90 backdrop-blur border border-border shadow-lg text-xs font-bold hover:bg-background"
          >
            <Crosshair className="w-4 h-4 text-primary" /> ตำแหน่งฉัน
          </button>

          {!point && (
            <div className="absolute inset-x-0 top-3 z-[1000] flex justify-center pointer-events-none">
              <span className="px-3 py-1.5 rounded-full bg-background/90 backdrop-blur border border-border shadow text-xs font-bold text-muted-foreground">
                คลิกบนแผนที่หรือค้นหาด้านบนเพื่อปักหมุด
              </span>
            </div>
          )}
        </div>

        {/* Footer: selected value + confirm */}
        <div className="px-5 py-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อสถานที่ (แก้ไขได้)"
              className="h-10 text-sm flex-1"
            />
            {reverseLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={cn('text-xs font-mono', point ? 'text-foreground' : 'text-muted-foreground')}>
              {point ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}` : 'ยังไม่ได้เลือกพิกัด'}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
              <Button type="button" onClick={confirm} disabled={!point} className="gap-1.5">
                <Check className="w-4 h-4" /> ใช้ตำแหน่งนี้
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
