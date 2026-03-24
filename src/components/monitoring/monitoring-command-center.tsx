"use client"

import { useMemo, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Search, 
    Activity, 
    Truck, 
    Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { DashboardMap } from "@/components/dashboard/dashboard-map"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { predictJobDelay } from "@/services/ai-prediction"
import { SafetyScoreBadge } from "./safety-score-badge"
import { useLanguage } from "@/components/providers/language-provider"
import { useRealtime } from "@/hooks/useRealtime"
import { RealtimeIndicator } from "@/components/ui/realtime-indicator"
import { toast } from "sonner"
import { calculateSafetyScore } from "@/services/safety-scoring"

export type DriverWithGPS = Driver & {
    Latitude: number | null
    Longitude: number | null
    Last_Update: string | null
    Speed?: number
    Heading?: number
}

interface Vehicle {
    vehicle_plate: string
    vehicle_type: string
    max_weight_kg: number | null
    max_volume_cbm: number | null
}

interface MonitoringCommandCenterProps {
    initialJobs: Job[]
    initialDrivers: DriverWithGPS[]
    initialContacts?: any[]
    allDrivers?: Driver[]
    initialHealthAlerts?: any[]
}

export function MonitoringCommandCenter({ 
    initialJobs, 
    initialDrivers, 
    initialContacts = [], 
    allDrivers = [],
    initialHealthAlerts = []
}: MonitoringCommandCenterProps) {
    const { t } = useLanguage()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'jobs' | 'drivers' | 'alerts' | 'health'>('all')
    const [drivers, setDrivers] = useState(initialDrivers)
    const [jobs, setJobs] = useState(initialJobs)
    const healthAlerts = initialHealthAlerts
    const [focusPosition, setFocusPosition] = useState<[number, number] | undefined>(undefined)

    const [isChatOpen, setIsChatOpen] = useState(false)
    const [chatDriverId, setChatDriverId] = useState<string | null>(null)
    const isMounted = useRef(true)
    const searchParams = useSearchParams()

    // Real-time: gps_logs
    useRealtime('gps_logs', (payload) => {
        if (payload.eventType === 'INSERT') {
            const newLog = payload.new
            const driverId = newLog.driver_id || newLog.Driver_ID
            setDrivers(prev => prev.map(d => {
                if (d.Driver_ID === driverId) {
                    return {
                        ...d,
                        Latitude: newLog.latitude || newLog.Latitude,
                        Longitude: newLog.longitude || newLog.Longitude,
                        Speed: newLog.speed || newLog.Speed || 0,
                        Heading: newLog.heading || newLog.Heading,
                        Last_Update: newLog.timestamp || newLog.Timestamp || new Date().toISOString()
                    }
                }
                return d
            }))
        }
    })

    // Real-time: Jobs_Main
    useRealtime('Jobs_Main', (payload) => {
        const updatedJob = payload.new as Job
        setJobs(prev => {
            const index = prev.findIndex(j => j.Job_ID === updatedJob.Job_ID)
            if (index !== -1) {
                const newJobs = [...prev]
                newJobs[index] = { ...newJobs[index], ...updatedJob }
                return newJobs
            }
            if (updatedJob.Job_Status === 'SOS' || updatedJob.Job_Status === 'Failed') {
                return [updatedJob, ...prev]
            }
            return prev
        })
    })

    // Real-time: Notifications
    useRealtime('Notifications', (payload) => {
        if (payload.eventType === 'INSERT') {
            const notification = payload.new
            toast(notification.Title || t('monitoring.alerts'), {
                description: notification.Message
            })
        }
    })

    const handleJobClick = (job: Job) => {
        setSelectedId(job.Job_ID)
        const jobAny = job as any
        if (jobAny.Pickup_Lat && jobAny.Pickup_Lon) {
            setFocusPosition([jobAny.Pickup_Lat, jobAny.Pickup_Lon])
            setTimeout(() => setFocusPosition(undefined), 1000)
        }
    }

    const getPrediction = (job: Job) => {
        const jobStatus = job.Job_Status || ''
        if (['Completed', 'Delivered', 'Cancelled'].includes(jobStatus)) return null
        const driver = drivers.find(d => d.Driver_ID === (job as any).Driver_ID)
        if (!driver || !driver.Latitude || !driver.Longitude) return null
        return predictJobDelay(job as any, driver.Latitude, driver.Longitude, driver.Speed || 0)
    }

    const driversWithGPS = useMemo(() => {
        return drivers.map(d => {
            const lastUpdateDate = d.Last_Update ? new Date(d.Last_Update) : null
            const isOnline = lastUpdateDate && (new Date().getTime() - lastUpdateDate.getTime() < 10 * 60 * 1000)
            return { ...d, status: isOnline ? 'Online' : 'Offline' }
        })
    }, [drivers])

    const alertCount = jobs.filter(j => j.Job_Status === 'SOS' || j.Job_Status === 'Failed').length

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#050110] text-slate-300 overflow-hidden font-sans rounded-[2.5rem] border border-white/5 shadow-2xl relative z-10">
            {/* 1. Tactical Sidebar */}
            <div className="w-[400px] border-r border-white/5 flex flex-col bg-slate-950/50 backdrop-blur-2xl">
                <div className="p-8 border-b border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 italic">
                            <div className="p-2.5 bg-primary/20 rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(255,30,133,0.2)]">
                                <Activity className="text-primary" size={24} />
                            </div>
                            {t('monitoring.title')}
                        </h2>
                        <RealtimeIndicator isLive={true} className="bg-white/5 border-white/10 text-primary" />
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder={t('common.search')}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-slate-600 font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 mt-8 overflow-x-auto pb-2 custom-scrollbar">
                        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={t('common.all')} />
                        <FilterButton active={filter === 'drivers'} onClick={() => setFilter('drivers')} label={t('monitoring.active_fleet')} color="blue" />
                        <FilterButton active={filter === 'alerts'} onClick={() => setFilter('alerts')} label={t('monitoring.alerts')} count={alertCount} color="rose" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {filter === 'all' || filter === 'drivers' ? (
                        driversWithGPS.map(driver => (
                            <div key={driver.Driver_ID} className="bg-white/5 border border-white/5 p-4 rounded-3xl hover:bg-white/10 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3" onClick={() => handleJobClick(driver as any)}>
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                <Truck size={20} className="text-primary" />
                                            </div>
                                            <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#050110]", driver.status === 'Online' ? "bg-emerald-500" : "bg-slate-500")} />
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-white">{driver.Driver_Name}</p>
                                            <p className="text-lg font-bold font-bold text-slate-500 uppercase tracking-tighter">{driver.Vehicle_Plate}</p>
                                        </div>
                                    </div>
                                    <SafetyScoreBadge metrics={calculateSafetyScore(driver)} />
                                </div>
                            </div>
                        ))
                    ) : null}
                </div>
            </div>

            {/* 2. Integrated Map */}
            <div className="flex-1 relative">
                <DashboardMap 
                    drivers={driversWithGPS as any} 
                    allJobs={jobs}
                    focusPosition={focusPosition} 
                />
            </div>
        </div>
    )
}

function FilterButton({ active, onClick, label, count, color = "primary" }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "px-5 py-2.5 rounded-xl text-lg font-bold font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all border flex items-center gap-2",
                active 
                    ? `bg-${color}-500 text-white border-${color}-400 shadow-lg shadow-${color}-500/20 scale-105` 
                    : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
            )}
        >
            {label}
            {count > 0 && <span className="px-1.5 py-0.5 bg-white text-rose-500 rounded-md text-base font-bold">{count}</span>}
        </button>
    )
}

