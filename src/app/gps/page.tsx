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
  Last_Update: string
}

export default function GPSPage() {
  const [gpsData, setGpsData] = useState<GPSDriver[]>([])
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/gps/data')
      if (res.ok) {
        const data = await res.json()
        setGpsData(data.drivers || [])
        setStats(data.stats || { total: 0, online: 0, offline: 0 })
      }
    } catch (e) {
      console.error('Failed to fetch GPS data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial mock data
    const mockDrivers: GPSDriver[] = [
      { Driver_ID: '1', Driver_Name: 'สมชาย ใจดี', Vehicle_Plate: '70-0977', Last_Update: new Date(Date.now() - 120000).toISOString() },
      { Driver_ID: '2', Driver_Name: 'มา', Vehicle_Plate: '-2592', Last_Update: new Date(Date.now() - 360000).toISOString() },
      { Driver_ID: '3', Driver_Name: 'กาซิม', Vehicle_Plate: '3ฌร-6404', Last_Update: new Date(Date.now() - 60000).toISOString() },
      { Driver_ID: '4', Driver_Name: 'ปัทวี', Vehicle_Plate: '3ฌร-6404', Last_Update: new Date(Date.now() - 30000).toISOString() },
      { Driver_ID: '5', Driver_Name: 'วิคัน', Vehicle_Plate: '-2592', Last_Update: new Date(Date.now() - 600000).toISOString() },
      { Driver_ID: '6', Driver_Name: 'มอนลล', Vehicle_Plate: '-2592', Last_Update: new Date(Date.now() - 900000).toISOString() },
    ]
    
    setGpsData(mockDrivers)
    const online = mockDrivers.filter(d => d.Last_Update > fiveMinutesAgo).length
    setStats({
      total: mockDrivers.length,
      online,
      offline: mockDrivers.length - online
    })
    setIsLoading(false)
  }, [])

  // Convert GPS data to map markers
  const driverLocations: DriverLocation[] = gpsData.map((d, i) => ({
    id: d.Driver_ID,
    name: `${d.Vehicle_Plate} - ${d.Driver_Name}`,
    lat: 13.7563 + (Math.random() - 0.5) * 0.1,
    lng: 100.5018 + (Math.random() - 0.5) * 0.1,
    status: d.Last_Update > fiveMinutesAgo ? 'Online' : 'Offline',
    lastUpdate: new Date(d.Last_Update).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }))

  const filteredData = gpsData.filter(d => 
    d.Vehicle_Plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.Driver_Name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <Button size="lg" className="gap-2" onClick={fetchData} disabled={isLoading}>
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
                const isOnline = driver.Last_Update && driver.Last_Update > fiveMinutesAgo
                
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
