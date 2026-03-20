"use client"

import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Search, 
    Truck, 
    MapPin, 
    ChevronRight, 
    X,
    Phone,
    MessageSquare,
    Signal,
    Activity,
    Heart,
    Wrench,
    ShieldAlert,
    Users
} from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardMap } from "@/components/dashboard/dashboard-map"
import { ActiveTripTimeline } from "@/components/dashboard/active-trip-timeline"
import { CargoCapacity } from "@/components/logistics/cargo-capacity"
import { Job } from "@/lib/supabase/jobs"
import { toast } from "sonner"
import { Driver } from "@/lib/supabase/drivers"
import { HealthAlert } from "@/lib/supabase/fleet-health"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChatWindow } from "@/components/chat/chat-window"
import { useRealtime } from "@/hooks/useRealtime"
import { RealtimeIndicator } from "@/components/ui/realtime-indicator"


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
    initialContacts?: { id: string; name?: string; phone?: string }[]
    allDrivers?: Driver[]
    initialHealthAlerts?: HealthAlert[]
}

export function MonitoringCommandCenter({ 
    initialJobs, 
    initialDrivers, 
    initialContacts = [], 
    allDrivers = [],
    initialHealthAlerts = []
}: MonitoringCommandCenterProps) {
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

    // Handle Deep-linking from Notifications
    useEffect(() => {
        const driverId = searchParams.get('driver')
        const openChat = searchParams.get('openChat') === 'true'

        if (driverId) {
            setSelectedId(driverId)
            if (openChat) {
                setChatDriverId(driverId)
                setIsChatOpen(true)
            }
        }
    }, [searchParams])

    useEffect(() => {
        return () => { isMounted.current = false }
    }, [])

    // Real-time GPS Tracking
    useEffect(() => {
        const supabase = createClient()
        
        const channel = supabase
            .channel('fleet-gps-live')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'gps_logs' },
                (payload) => {
                    if (!isMounted.current) return
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
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Real-time Job Status Updates (SOS/Alerts)
    useEffect(() => {
        const supabase = createClient()
        
        const channel = supabase
            .channel('job-status-alerts')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'Jobs_Main' },
                (payload) => {
                    if (!isMounted.current) return
                    const updatedJob = payload.new as Job
                    setJobs(prev => {
                        const index = prev.findIndex(j => j.Job_ID === updatedJob.Job_ID)
                        if (index !== -1) {
                            const newJobs = [...prev]
                            newJobs[index] = { ...newJobs[index], ...updatedJob }
                            return newJobs
                        }
                        // If it's a new job that just became SOS/Failed, we might want to add it
                        if (updatedJob.Job_Status === 'SOS' || updatedJob.Job_Status === 'Failed') {
                            return [updatedJob, ...prev]
                        }
                        return prev
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Detect if a job is delayed
    const getJobDelayStatus = (job: Job) => {
        if (!job.Plan_Date || ['Completed', 'Delivered', 'Cancelled'].includes(job.Job_Status)) return null
        
        const now = new Date()
        const planDate = new Date(job.Plan_Date)
        
        // If plan date is before today, it's definitely delayed
        const isPastDay = planDate.setHours(0,0,0,0) < now.setHours(0,0,0,0)
        
        // For today's jobs, check if it's still 'New' or 'Assigned' after a certain hour (e.g., 2PM)
        const isOverdueToday = job.Plan_Date === now.toISOString().split('T')[0] && 
                               now.getHours() >= 14 && 
                               ['New', 'Assigned'].includes(job.Job_Status)

        return isPastDay || isOverdueToday ? 'delayed' : null
    }

    // Exception flagging logic
    const getJobExceptions = (job: Job) => {
        const exceptions: string[] = []
        if (['Delivered', 'Completed'].includes(job.Job_Status)) {
            if (!job.Photo_Proof_Url) exceptions.push('Missing Photo')
            if (!job.Signature_Url) exceptions.push('Missing Sig')
        }
        if (job.Job_Status === 'SOS') exceptions.push('Emergency')
        return exceptions
    }

    const filteredDrivers = useMemo(() => {
        return drivers.filter(d =>
            d.Driver_Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.Vehicle_Plate?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [drivers, searchQuery])

    const filteredJobs = useMemo(() => {
        let base = jobs
        if (filter === 'alerts') {
            base = jobs.filter(j => j.Job_Status === 'SOS' || j.Job_Status === 'Failed')
        }
        return base.filter(j => 
            j.Job_ID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.Customer_Name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [jobs, searchQuery, filter])

    const filteredHealthAlerts = useMemo(() => {
        return healthAlerts.filter(a => 
            a.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [healthAlerts, searchQuery])

    const selectedEntity = useMemo(() => {
        if (!selectedId) return null
        return jobs.find(j => j.Job_ID === selectedId) || 
               drivers.find(d => d.Driver_ID === selectedId)
    }, [selectedId, jobs, drivers])

    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

    const getCapacityDefault = (type: string | null | undefined) => {
        const t = type?.toLowerCase() || ''
        if (t.includes('4') || t.includes('กระบะ') || t.includes('pickup')) return 2000
        if (t.includes('6') || t.includes('หก')) return 7000
        if (t.includes('10') || t.includes('สิบ')) return 15000
        if (t.includes('trailer') || t.includes('ลาก') || t.includes('semi')) return 25000
        return 15000 // Global fallback
    }

    // Find current selected driver/job object
    const selectedDriver = useMemo(() => drivers.find(d => d.Driver_ID === selectedId), [drivers, selectedId])
    const selectedJob = useMemo(() => jobs.find(j => j.Job_ID === selectedId), [jobs, selectedId])

    // Memoize the active job for the selected driver to prevent flickering
    const selectedActiveJob = useMemo(() => {
        if (!selectedId) return null
        // If we already have a selected job object, use it
        if (selectedJob) return selectedJob
        // Otherwise, find the active job for the selected driver
        return jobs.find(j => j.Driver_ID === selectedId && j.Job_Status !== 'Completed') || null
    }, [selectedId, selectedJob, jobs])

    // Memoize vehicle info for the capacity panel
    const vehicleInfo = useMemo(() => {
        const vType = selectedVehicle?.vehicle_type || selectedJob?.Vehicle_Type || selectedActiveJob?.Vehicle_Type || null
        const vPlate = selectedVehicle?.vehicle_plate || selectedJob?.Vehicle_Plate || selectedDriver?.Vehicle_Plate || 'N/A'
        const totalCap = selectedVehicle?.max_weight_kg || getCapacityDefault(vType)
        // If no weight data, use 0 instead of defaulting to 100% capacity
        const usedCap = (selectedActiveJob?.Weight_Kg && selectedActiveJob.Weight_Kg > 0) ? selectedActiveJob.Weight_Kg : 0
        
        return { vType, vPlate, totalCap, usedCap }
    }, [selectedVehicle, selectedJob, selectedActiveJob, selectedDriver])
    // Fetch Vehicle specs on demand with race condition protection
    useEffect(() => {
        let isCancelled = false
        const plate = selectedDriver?.Vehicle_Plate || selectedJob?.Vehicle_Plate
        
        if (!selectedId || !plate || plate === '-') {
            if (selectedVehicle !== null && isMounted.current) {
                setSelectedVehicle(null)
            }
            return
        }

        const normalize = (p: string) => p.replace(/[^\u0E00-\u0E7F0-9a-zA-Z]/g, '').toLowerCase()
        const currentPlateClean = normalize(plate)
        const loadedPlateClean = selectedVehicle ? normalize(selectedVehicle.vehicle_plate || '') : ''

        if (loadedPlateClean === currentPlateClean) return

        const fetchVehicle = async () => {
            const supabase = createClient()

            // 1. Try exact match
            const { data: exactMatch } = await supabase
                .from('master_vehicles')
                .select('*')
                .eq('vehicle_plate', plate)
                .single()
            
            if (exactMatch && isMounted.current && !isCancelled) {
                setSelectedVehicle(exactMatch)
                return
            }

            // 2. Try partial match if exact match fails
            if (isMounted.current && !isCancelled) {
                const { data: partialMatch } = await supabase
                    .from('master_vehicles')
                    .select('*')
                    .ilike('vehicle_plate', `%${plate}%`)
                    .limit(1)
                    .single()
                
                if (partialMatch && isMounted.current && !isCancelled) {
                    setSelectedVehicle(partialMatch)
                }
            }
        }
        fetchVehicle()

        return () => {
            isCancelled = true
        }
    }, [selectedId, selectedDriver?.Vehicle_Plate, selectedJob?.Vehicle_Plate, selectedVehicle])

    // Detect online status (within 10 mins)
    const getDriverStatus = (lastUpdate: string | null) => {
        if (!lastUpdate) return 'offline'
        const tenMinutes = 10 * 60 * 1000
        const isOnline = new Date().getTime() - new Date(lastUpdate).getTime() < tenMinutes
        return isOnline ? 'online' : 'offline'
    }

    // Handlers
    const handleDriverClick = (driver: MonitoringCommandCenterProps['initialDrivers'][number]) => {
        if (selectedId !== driver.Driver_ID) {
            setSelectedId(driver.Driver_ID)
            const currentPlate = selectedVehicle?.vehicle_plate
            if (currentPlate !== driver.Vehicle_Plate) {
                setSelectedVehicle(null)
            }
        }
        if (driver.Latitude && driver.Longitude) {
            setFocusPosition([driver.Latitude, driver.Longitude])
            setTimeout(() => setFocusPosition(undefined), 1000)
        }
    }

    const handleJobClick = (job: Job) => {
        if (selectedId !== job.Job_ID) {
            setSelectedId(job.Job_ID)
            const currentPlate = selectedVehicle?.vehicle_plate
            if (currentPlate !== job.Vehicle_Plate) {
                setSelectedVehicle(null)
            }
        }
        if (job.Pickup_Lat && job.Pickup_Lon) {
            setFocusPosition([job.Pickup_Lat, job.Pickup_Lon])
            setTimeout(() => setFocusPosition(undefined), 1000)
        }
    }

    const driversWithGPS = useMemo(() => {
        let base: DriverWithGPS[] = []
        if (selectedId) {
            const plate = selectedDriver?.Vehicle_Plate || selectedJob?.Vehicle_Plate
            base = drivers.filter(d => 
                (d.Driver_ID === selectedId || d.Vehicle_Plate === plate) &&
                d.Latitude != null && d.Longitude != null &&
                !isNaN(d.Latitude) && !isNaN(d.Longitude)
            )
        } else {
            base = drivers.filter(d => 
                d.Latitude != null && d.Longitude != null &&
                !isNaN(d.Latitude) && !isNaN(d.Longitude)
            )
        }

        return base.map(d => ({
            ...d,
            Driver_Name: d.Driver_Name || 'Unknown',
            Vehicle_Plate: d.Vehicle_Plate || '-',
            Last_Update: d.Last_Update || null,
            Latitude: d.Latitude!,
            Longitude: d.Longitude!
        }))
    }, [selectedId, drivers, selectedDriver, selectedJob])

    // Calculate planned route for selected job
    const plannedRoute = useMemo(() => {
        const job = selectedActiveJob
        if (!job) return undefined
        
        const points: { lat: number; lng: number; name: string; type: 'start' | 'stop' | 'end' }[] = []
        
        if (job.Pickup_Lat && job.Pickup_Lon) {
            points.push({ lat: job.Pickup_Lat, lng: job.Pickup_Lon, name: job.Origin_Location || 'Start', type: 'start' })
        }
        
        if (job.original_destinations_json) {
            try {
                const stops = typeof job.original_destinations_json === 'string' 
                    ? JSON.parse(job.original_destinations_json) 
                    : job.original_destinations_json
                if (Array.isArray(stops)) {
                    stops.forEach((s: { lat?: number; lng?: number; name?: string }) => {
                        if (s.lat && s.lng) {
                            points.push({ lat: Number(s.lat), lng: Number(s.lng), name: s.name || 'Stop', type: 'stop' })
                        }
                    })
                }
            } catch {
                // Error parsing stops
            }
        }
        
        if (job.Delivery_Lat && job.Delivery_Lon) {
            points.push({ lat: job.Delivery_Lat, lng: job.Delivery_Lon, name: job.Dest_Location || 'End', type: 'end' })
        }
        
        return points.length > 0 ? points : undefined
    }, [selectedActiveJob])

    // Calculate route summary for the MapOverlay
    const routeSummary = useMemo(() => {
        const job = selectedActiveJob
        if (!job) return null

        // Find the current target (first non-completed stop or the final destination)
        let targetName = job.Dest_Location || 'End'
        if (job.original_destinations_json) {
             try {
                const stops = typeof job.original_destinations_json === 'string' 
                    ? JSON.parse(job.original_destinations_json) 
                    : job.original_destinations_json
                if (Array.isArray(stops)) {
                    const nextStop = stops.find((s: { status?: string; name?: string }) => s.status !== 'Completed')
                    if (nextStop) targetName = nextStop.name || 'Next Stop'
                }
            } catch { /* ignore */ }
        }

        return {
            start: job.Origin_Location || 'Origin',
            end: job.Dest_Location || 'Destination',
            target: targetName
        }
    }, [selectedActiveJob])

    return (
        <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden flex bg-gray-50">
            {/* 1. Left Sidebar: Control Panel */}
            <div className="w-[380px] h-full bg-white border-r border-gray-100 flex flex-col z-20 shadow-2xl">
                <div className="p-6 bg-slate-950 border-b border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <Activity className="text-emerald-400" size={20} />
                            </div>
                            Control Centre
                        </h2>
                        <RealtimeIndicator isLive={true} className="bg-white/5 border-white/10 text-emerald-400" />
                    </div>
                    
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            placeholder="Search jobs, plates, drivers..."
                            className="pl-10 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500/50 transition-all h-12 text-sm font-bold"
                            value={searchQuery}
                            onChange={(evt) => {
                                const val = evt.target.value
                                setSearchQuery(val)
                            }}
                        />
                    </div>

                    <div className="flex gap-2">
                        {(['all', 'jobs', 'drivers', 'alerts', 'health'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={cn(
                                    "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl border transition-all duration-300 relative overflow-hidden",
                                    filter === t 
                                        ? "bg-slate-900 border-emerald-500/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-105 z-10" 
                                        : "bg-slate-800/10 border-transparent text-slate-500 hover:bg-slate-800/20"
                                )}
                            >
                                {filter === t && (
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />
                                )}
                                <div className="flex flex-col items-center gap-1">
                                    {t === 'all' && <Activity size={14} />}
                                    {t === 'jobs' && <Truck size={14} />}
                                    {t === 'drivers' && <Users size={14} />}
                                    {t === 'alerts' && <ShieldAlert size={14} />}
                                    {t === 'health' && <Heart size={14} />}
                                    {t}
                                    {t === 'alerts' && jobs.filter(j => j.Job_Status === 'SOS' || j.Job_Status === 'Failed').length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                    )}
                                    {t === 'health' && healthAlerts.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {/* Health Alerts Section */}
                    {filter === 'health' && (
                        <div className="space-y-3">
                            <p className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fleet Health Issues</p>
                            {filteredHealthAlerts.map((alert, idx) => (
                                <motion.div 
                                    key={`${alert.vehicle_plate}-${idx}`}
                                    whileHover={{ x: 8, scale: 1.02 }}
                                    className={cn(
                                        "p-5 bg-white border border-gray-100 shadow-xl cursor-pointer transition-all duration-300 relative overflow-hidden group",
                                        "rounded-br-[3rem] rounded-tl-[1.5rem] rounded-tr-lg rounded-bl-lg",
                                        alert.priority === 'high' ? "border-l-8 border-l-red-500" : "border-l-8 border-l-amber-500"
                                    )}
                                    onClick={() => {
                                        const driver = drivers.find(d => d.Vehicle_Plate === alert.vehicle_plate)
                                        if (driver) handleDriverClick(driver)
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center",
                                                alert.priority === 'high' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                                            )}>
                                                {alert.issue_type === 'maintenance' ? <Wrench size={14} /> : 
                                                 alert.issue_type === 'compliance' ? <ShieldAlert size={14} /> : <Heart size={14} />}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest leading-none mb-1">{alert.issue_type}</div>
                                                <div className="text-sm font-black text-gray-900 leading-tight">{alert.description}</div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn(
                                            "rounded-lg text-[10px] font-black border-0",
                                            alert.priority === 'high' ? "text-red-500 bg-red-50" : "text-amber-500 bg-amber-50"
                                        )}>
                                            {alert.priority.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Truck size={12} className="text-gray-400" /> {alert.vehicle_plate}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users size={12} className="text-gray-400" /> {alert.driver_name || 'No Driver'}
                                        </div>
                                    </div>
                                    {alert.expiry_date && (
                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expires</span>
                                            <span className="text-[10px] font-black text-red-500">{new Date(alert.expiry_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {alert.remaining_km !== undefined && (
                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Due in</span>
                                            <span className="text-[10px] font-black text-amber-600">{alert.remaining_km} KM</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {filteredHealthAlerts.length === 0 && (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Heart className="text-emerald-500" size={32} />
                                    </div>
                                    <h3 className="text-gray-900 font-black tracking-tight">All Assets Healthy</h3>
                                    <p className="text-gray-500 text-[10px] font-bold mt-1 uppercase tracking-widest">No alerts to display</p>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Active Jobs Section */}
                    {(filter === 'all' || filter === 'jobs') && (
                        <div className="space-y-3">
                            <p className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Operations</p>
                            {filteredJobs.map(job => (
                                <motion.div 
                                    key={job.Job_ID}
                                    whileHover={{ x: 8, scale: 1.02 }}
                                    onClick={() => handleJobClick(job)}
                                    className={cn(
                                        "p-5 border cursor-pointer transition-all duration-300 relative overflow-hidden",
                                        "rounded-br-[3rem] rounded-tl-[1.5rem] rounded-tr-lg rounded-bl-lg",
                                        selectedId === job.Job_ID 
                                            ? "bg-emerald-50/50 border-emerald-500/30 border-l-8 border-l-emerald-500 shadow-2xl" 
                                            : job.Job_Status === 'SOS'
                                                ? "bg-red-50/50 border-red-500/50 border-l-8 border-l-red-500 shadow-2xl shadow-red-500/10 animate-pulse"
                                                : "bg-white border-gray-100 border-l-8 border-l-emerald-500/30 shadow-xl hover:shadow-2xl hover:border-emerald-500/20"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                                                {job.Job_ID.slice(-4)}
                                            </span>
                                            {getJobDelayStatus(job) === 'delayed' && (
                                                <Badge className="bg-red-500 text-white border-0 text-[8px] font-black animate-pulse py-0 h-4">
                                                    DELAYED
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge className={cn(
                                            "border-0 text-[9px] font-black",
                                            job.Job_Status === 'SOS' ? "bg-red-500 text-white" : "bg-emerald-500/10 text-emerald-600"
                                        )}>
                                            {job.Job_Status}
                                        </Badge>
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 truncate mb-1">{job.Customer_Name}</h4>
                                    
                                    {getJobExceptions(job).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {getJobExceptions(job).map(ex => (
                                                <span key={ex} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-tighter">
                                                    {ex}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                        <Truck size={12} />
                                        {job.Vehicle_Plate}
                                        <ChevronRight size={10} className="text-gray-300" />
                                        <MapPin size={12} />
                                        <span className="truncate flex-1">
                                            {job.Dest_Location}
                                            {Array.isArray(job.original_destinations_json) && job.original_destinations_json.length > 0 && (
                                                <span className="ml-1 text-emerald-600 font-black">
                                                    +{job.original_destinations_json.length} stops
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Online Drivers Section */}
                    {(filter === 'all' || filter === 'drivers') && (
                        <div className="space-y-3 pt-4">
                            <p className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fleet Connection</p>
                            {filteredDrivers.map(driver => (
                                <div 
                                    key={driver.Driver_ID}
                                    onClick={() => handleDriverClick(driver)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all",
                                        selectedId === driver.Driver_ID 
                                            ? "bg-emerald-50 border-emerald-500/30 shadow-md" 
                                            : "bg-white border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    <div className="relative">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                            getDriverStatus(driver.Last_Update) === 'online' 
                                                ? "bg-emerald-100 text-emerald-600" 
                                                : "bg-gray-100 text-gray-400"
                                        )}>
                                            <Truck size={20} />
                                        </div>
                                        <div className={cn(
                                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full",
                                            jobs.some(j => j.Driver_ID === driver.Driver_ID && j.Job_Status === 'SOS')
                                                ? "bg-red-500 animate-ping"
                                                : getDriverStatus(driver.Last_Update) === 'online' ? "bg-emerald-500" : "bg-gray-400"
                                        )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-gray-900 truncate">{driver.Driver_Name}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
                                            {driver.Vehicle_Plate}
                                        </p>
                                        <p className="text-[9px] text-gray-400 flex items-center gap-1">
                                            <Signal size={8} />
                                            {driver.Last_Update ? `Last seen: ${new Date(driver.Last_Update).toLocaleTimeString('th-TH')}` : 'No signal'}
                                        </p>
                                    </div>
                                    <button className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-emerald-500">
                                        <Phone size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Main View: Integrated Map */}
            <div className="flex-1 relative">
                <DashboardMap 
                    drivers={driversWithGPS} 
                    focusPosition={focusPosition} 
                    plannedRoute={plannedRoute}
                    routeSummary={routeSummary}
                />
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-10 scale-110">
                    <div className="bg-slate-950/90 backdrop-blur-xl px-8 py-4 rounded-full border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center gap-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white leading-none">{initialJobs.length}</span>
                                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">Active Jobs</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <Signal className="text-emerald-400" size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white leading-none">
                                    {drivers.filter(d => getDriverStatus(d.Last_Update) === 'online').length}
                                </span>
                                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">Online Fleet</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Activity className="text-blue-400" size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white leading-none">
                                    {initialJobs.filter(j => j.Job_Status === 'In Transit').length}
                                </span>
                                <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.2em]">Live Trips</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Detail Drawer (Pops out when selected) */}
                <AnimatePresence>
                    {selectedId && (
                        <motion.div 
                            initial={{ x: 500 }}
                            animate={{ x: 0 }}
                            exit={{ x: 500 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-[450px] bg-white border-l border-gray-100 z-30 shadow-[-20px_0_80px_rgba(0,0,0,0.15)] p-0 overflow-y-auto custom-scrollbar rounded-tl-[10rem]"
                        >
                            <div className="p-8 relative">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setSelectedId(null)}
                                className="absolute top-4 right-4 rounded-full hover:bg-gray-100"
                            >
                                <X size={20} />
                            </Button>

                            <div className="space-y-8 pb-10">
                                <section>
                                    <Badge className="bg-emerald-500 text-white border-0 font-black mb-4">ENTITY DETAILS</Badge>
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-2">
                                        {selectedEntity && ('Customer_Name' in selectedEntity ? selectedEntity.Customer_Name : selectedEntity.Driver_Name)}
                                    </h3>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                        Vehicle: {selectedEntity?.Vehicle_Plate || 'N/A'}
                                    </p>
                                </section>

                                {selectedId && selectedActiveJob && (
                                    <ActiveTripTimeline job={selectedActiveJob} />
                                )}
                                
                                {(selectedVehicle || vehicleInfo.vPlate !== 'N/A') && (
                                    <CargoCapacity stats={{
                                        totalCapacity: vehicleInfo.totalCap,
                                        usedCapacity: vehicleInfo.usedCap,
                                        unit: "kg",
                                        vehicleType: vehicleInfo.vType || "Truck",
                                        plate: vehicleInfo.vPlate
                                    }} />
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Button 
                                        className="rounded-2xl h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20"
                                        onClick={() => {
                                            const phone = selectedDriver?.Mobile_No || 'N/A'
                                            toast(`Phone: ${phone}`, {
                                                action: {
                                                    label: 'Copy',
                                                    onClick: () => navigator.clipboard.writeText(phone || '')
                                                },
                                            })
                                        }}
                                    >
                                        <Phone className="mr-2" size={18} /> {selectedDriver?.Mobile_No || 'Call Driver'}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="rounded-2xl h-14 border-gray-200 text-gray-700 font-black"
                                        onClick={() => {
                                            setChatDriverId(selectedId)
                                            setIsChatOpen(true)
                                        }}
                                    >
                                        <MessageSquare className="mr-2" size={18} /> Chat
                                    </Button>
                                </div>
                            </div>
                        </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Modal */}
                <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                    <DialogContent className="max-w-5xl p-0 overflow-hidden bg-transparent border-none">
                        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl h-[80vh]">
                            <ChatWindow 
                                initialContacts={initialContacts} 
                                initialDrivers={allDrivers} 
                                forcedDriverId={chatDriverId}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
