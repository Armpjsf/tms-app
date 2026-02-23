"use client"

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MapPin, 
  Search,
  Signal,
  SignalZero,
  Truck,
  RefreshCw,
} from "lucide-react"
import { getFleetGPSStatus } from '@/lib/supabase/gps'
import { createClient } from '@/utils/supabase/client'
import type { DriverLocation } from '@/components/maps/leaflet-map'

const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-slate-800/50 rounded-xl flex items-center justify-center">
      <div className="text-slate-400 animate-pulse">Loading Map...</div>
    </div>
  )
})

type GPSDriver = {
  Driver_ID: string
  Driver_Name: string
  Vehicle_Plate: string
  Last_Update: string | null
  Latitude: number | null
  Longitude: number | null
}

export default function GPSPage() {
  const [gpsData, setGpsData] = useState<GPSDriver[]>([])
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const supabase = createClient()

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await getFleetGPSStatus()
      setGpsData(data)
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).getTime()
      const online = data.filter(d => d.Last_Update && new Date(d.Last_Update).getTime() > fiveMinutesAgo).length
      
      setStats({
        total: data.length,
        online,
        offline: data.length - online
      })
    } catch (e) {
      console.error('Failed to fetch GPS data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    
    // Subscribe to REALTIME GPS logs
    const channel = supabase
      .channel('gps-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_logs' },
        (payload) => {
          const newLog = payload.new as { driver_id: string; latitude: number; longitude: number; timestamp?: string }
          setGpsData(prev => {
            const updated = prev.map(d => {
                if (d.Driver_ID === newLog.driver_id) {
                    return {
                        ...d,
                        Latitude: newLog.latitude,
                        Longitude: newLog.longitude,
                        Last_Update: newLog.timestamp || new Date().toISOString()
                    }
                }
                return d
            })
            
            // Re-calculate stats on update
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).getTime()
            const online = updated.filter(d => d.Last_Update && new Date(d.Last_Update).getTime() > fiveMinutesAgo).length
            setStats({
                total: updated.length,
                online,
                offline: updated.length - online
            })

            return updated
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Convert GPS data to map markers
  const driverLocations: DriverLocation[] = gpsData
    .filter(d => d.Latitude && d.Longitude) // Only show drivers with location
    .map((d) => {
      const isOnline = d.Last_Update && new Date(d.Last_Update).getTime() > (Date.now() - 5 * 60 * 1000)
      return {
        id: d.Driver_ID,
        name: `${d.Vehicle_Plate} - ${d.Driver_Name}`,
        lat: d.Latitude!,
        lng: d.Longitude!,
        status: isOnline ? 'Online' : 'Offline',
        lastUpdate: d.Last_Update ? new Date(d.Last_Update).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'
      }
    })

  const filteredData = gpsData.filter(d => 
    (d.Vehicle_Plate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.Driver_Name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const fiveMinutesAgoTime = Date.now() - 5 * 60 * 1000

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <MapPin className="text-emerald-400" />
            GPS ติดตามรถ
          </h1>
          <p className="text-slate-400">ติดตามตำแหน่งรถแบบ Real-time</p>
        </div>
        <Button size="lg" className="gap-2" onClick={loadData} disabled={isLoading}>
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          รีเฟรช
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-2xl font-bold text-indigo-400">{stats.total}</p>
          <p className="text-xs text-slate-400">รถทั้งหมด</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Signal size={16} className="text-emerald-400" />
            <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
          </div>
          <p className="text-xs text-slate-400">ออนไลน์</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-500/10 border border-slate-500/20">
          <div className="flex items-center gap-2">
            <SignalZero size={16} className="text-slate-400" />
            <p className="text-2xl font-bold text-slate-400">{stats.offline}</p>
          </div>
          <p className="text-xs text-slate-400">ออฟไลน์</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map */}
        <Card variant="glass" className="lg:col-span-2">
          <CardContent className="p-0 overflow-hidden rounded-xl">
            <LeafletMap 
              drivers={driverLocations}
              height="500px"
              zoom={11}
              focusPosition={
                selectedDriver 
                  ? (() => {
                      const d = gpsData.find(d => d.Driver_ID === selectedDriver)
                      return (d?.Latitude && d?.Longitude) ? [d.Latitude, d.Longitude] : undefined
                    })()
                  : undefined
              }
            />
          </CardContent>
        </Card>

        {/* Vehicle List */}
        <Card variant="glass" className="lg:col-span-1 overflow-hidden">
          <CardContent className="p-0 h-[500px] flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="ค้นหาทะเบียน..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filteredData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  ไม่พบข้อมูลรถ
                </div>
              ) : filteredData.map((driver) => {
                const isOnline = driver.Last_Update && new Date(driver.Last_Update).getTime() > fiveMinutesAgoTime
                
                return (
                  <div
                    key={driver.Driver_ID}
                    onClick={() => setSelectedDriver(driver.Driver_ID)}
                    className={`flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 ${
                      selectedDriver === driver.Driver_ID ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                      isOnline 
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                        : 'bg-gradient-to-br from-slate-500 to-slate-600'
                    }`}>
                      <Truck className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white truncate">{driver.Vehicle_Plate || "-"}</h3>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{driver.Driver_Name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {driver.Last_Update 
                          ? new Date(driver.Last_Update).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
