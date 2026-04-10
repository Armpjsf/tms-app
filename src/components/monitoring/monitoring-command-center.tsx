"use client"

import { useMemo, useState, useRef } from 'react'
import {
    Search,
    Activity,
    Truck,
    FileSpreadsheet
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
import { Button } from "@/components/ui/button"
import { ExcelExport } from "@/components/ui/excel-export"

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
            const isSOS = notification.Title?.includes('SOS')
            
            if (isSOS) {
                toast.error(notification.Title, {
                    description: notification.Message,
                    duration: 20000, // 20 seconds for SOS
                    action: {
                        label: '📍 ดูตำแหน่ง',
                        onClick: () => {
                            if (notification.Driver_ID) {
                                setSelectedId(notification.Driver_ID)
                                const drv = drivers.find(d => d.Driver_ID === notification.Driver_ID)
                                if (drv?.Latitude && drv?.Longitude) {
                                    setFocusPosition([drv.Latitude, drv.Longitude])
                                }
                            }
                        }
                    }
                })
            } else {
                toast(notification.Title || t('monitoring.alerts'), {
                    description: notification.Message
                })
            }
        }
    })

    const handleJobClick = (job: Job) => {
        setSelectedId(job.Job_ID)
        const jobAny = job as any
        if (jobAny.Pickup_Lat && jobAny.Pickup_Lon) {
            setFocusPosition([jobAny.Pickup_Lat, jobAny.Pickup_Lon])
        }
    }

    const handleDriverClick = (driver: DriverWithGPS) => {
        if (driver.Latitude && driver.Longitude) {
            setSelectedId(driver.Driver_ID)
            setFocusPosition([driver.Latitude, driver.Longitude])
        } else {
            toast.error(t('monitoring.no_location'))
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
        return drivers
            .map(d => {
                const lastUpdateDate = d.Last_Update ? new Date(d.Last_Update) : null
                const isOnline = lastUpdateDate && (new Date().getTime() - lastUpdateDate.getTime() < 10 * 60 * 1000)
                return { ...d, status: isOnline ? 'Online' : 'Offline' }
            })
            .sort((a, b) => (a.status === 'Online' ? -1 : 1))
    }, [drivers])

    const alertCount = jobs.filter(j => j.Job_Status === 'SOS' || j.Job_Status === 'Failed').length

    return (
        <div className="flex h-[calc(100vh-64px)] bg-background text-muted-foreground overflow-hidden font-sans rounded-3xl border border-border/5 shadow-2xl relative z-10">
            {/* 1. Tactical Sidebar */}
            <div className="w-[320px] border-r border-border/5 flex flex-col bg-background/50 backdrop-blur-2xl">
                <div className="p-6 border-b border-border/5">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2 italic">
                            <div className="p-2 bg-primary/20 rounded-xl border border-primary/30 shadow-[0_0_20px_rgba(255,30,133,0.2)]">
                                <Activity className="text-primary" size={18} />
                            </div>
                            {t('monitoring.title')}
                        </h2>
                        <div className="flex items-center gap-2">
                            <ExcelExport 
                                data={driversWithGPS}
                                filename="logispro_live_tracking_export"
                                trigger={
                                    <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center">
                                        <FileSpreadsheet size={14} />
                                    </button>
                                }
                            />
                            <RealtimeIndicator isLive={true} className="bg-muted/50 border-border/10 text-primary scale-75 origin-right" />
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder={t('common.search')}
                            className="w-full h-10 bg-muted/50 border border-border/10 rounded-xl pl-10 pr-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 focus:bg-muted/80 transition-all placeholder:text-muted-foreground outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-1.5 mt-6 overflow-x-auto pb-1 custom-scrollbar">
                        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={t('common.all')} />
                        <FilterButton active={filter === 'drivers'} onClick={() => setFilter('drivers')} label={t('monitoring.active_fleet')} color="blue" />
                        <FilterButton active={filter === 'alerts'} onClick={() => setFilter('alerts')} label={t('monitoring.alerts')} count={alertCount} color="rose" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {(filter === 'all' || filter === 'drivers') ? (
                        driversWithGPS
                            .filter(d => filter === 'all' || d.status === 'Online')
                            .map(driver => (
                                <div key={driver.Driver_ID} 
                                     onClick={() => handleDriverClick(driver)}
                                     className={cn(
                                        "bg-muted/50 border border-border/10 p-3 rounded-2xl hover:bg-muted/80 transition-all cursor-pointer group",
                                        selectedId === driver.Driver_ID && "ring-1 ring-primary bg-primary/5"
                                     )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                    <Truck size={16} className="text-primary" />
                                                </div>
                                                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050110]", driver.status === 'Online' ? "bg-emerald-500" : "bg-slate-500")} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground uppercase">{driver.Driver_Name}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{driver.Vehicle_Plate}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 scale-90 origin-right">
                                            <SafetyScoreBadge metrics={calculateSafetyScore(driver)} />
                                            {driver.Latitude && driver.Longitude && (
                                                <button 
                                                    className="px-2 py-1 text-[8px] font-black uppercase tracking-widest border border-primary/20 text-primary hover:bg-primary hover:text-white rounded-md transition-all whitespace-nowrap"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation()
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${driver.Latitude},${driver.Longitude}`, '_blank')
                                                    }}
                                                >
                                                    MAPS
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                    ) : filter === 'alerts' ? (
                        jobs.filter(j => j.Job_Status === 'SOS' || j.Job_Status === 'Failed').map(job => (
                            <div key={job.Job_ID}
                                 onClick={() => handleJobClick(job)}
                                 className={cn(
                                    "bg-rose-500/5 border border-rose-500/10 p-3 rounded-2xl hover:bg-rose-500/10 transition-all cursor-pointer group",
                                    selectedId === job.Job_ID && "ring-1 ring-rose-500"
                                 )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                                            <Activity size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">{job.Job_ID}</p>
                                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{job.Job_Status}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-foreground truncate max-w-[100px]">{job.Dest_Location}</p>
                                        <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60">{job.Driver_Name || 'No Driver'}</p>
                                    </div>
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
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border flex items-center gap-1.5",
                active 
                    ? `bg-primary text-white border-primary shadow-lg shadow-primary/20` 
                    : "bg-muted/50 border-border/10 text-muted-foreground hover:text-foreground"
            )}
        >
            {label}
            {count > 0 && <span className="px-1 py-0.5 bg-white text-rose-500 rounded-md text-[9px] font-black">{count}</span>}
        </button>
    )
}

