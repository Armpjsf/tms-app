"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateJob, createBulkJobs, deleteJob } from "@/app/planning/actions"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"
import { LocationAutocomplete } from "@/components/location-autocomplete"
import { VehicleAutocomplete } from "@/components/vehicle-autocomplete"
import { DriverAutocomplete } from "@/components/driver-autocomplete"
import { ZONES, VEHICLE_CAPACITIES } from "@/lib/constants"
import { useBranch } from "@/components/providers/branch-provider"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { AiSuggestionCard } from "@/components/planning/ai-suggestion-card"
import { geocodeAddress } from "@/lib/ai/geocoding"
import { extractCoordsFromUrl } from "@/lib/utils"
import { getDrivingDistance } from "@/lib/ai/distance"
import { 
  Activity, AlertTriangle, Banknote, Building2, Calendar, Check, Eye, EyeOff, 
  FileText, Fuel, History, Info, Link as LinkIcon, Loader2, MapPin, Package, 
  Plus, RefreshCw, Search as SearchIcon, Settings as SettingsIcon, ShieldCheck, Trash2, 
  Truck, User, X, Zap 
} from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/providers/language-provider"

import { Job, JobAssignment } from "@/lib/supabase/jobs"
import { Route, getLocationDirectory } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"
import { getFuelPrice, getSuggestedRate, syncDailyFuelPrices } from "@/lib/actions/fuel-actions"
import { getVehicleTypes, VehicleType as MasterVehicleType } from "@/lib/actions/vehicle-type-actions"
import { JobTimeline } from "./job-timeline"

type LocationPoint = {
  name: string
  lat: string
  lng: string
  phone?: string
}

type ExtraCost = {
  type: string
  cost_driver: number   // จ่ายให้รถ
  charge_cust: number   // เก็บจากลูกค้า
}

interface JobDialogProps {
  mode?: 'create' | 'edit'
  job?: Job | null
  drivers?: Driver[]
  vehicles?: Vehicle[]
  customers?: Customer[]
  routes?: Route[]
  subcontractors?: Subcontractor[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  canViewIncome?: boolean
  canViewExpense?: boolean
  canAssign?: boolean
  canDelete?: boolean
  defaultDate?: string
}

const EXPENSE_TYPES = [
  "Labor",
  "Pallet",
  "Expressway",
  "Overtime",
  "Parking",
  "Fuel Surcharge",
  "Other"
]

function generateJobId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `JOB-${year}${month}${day}-${random}`
}

export function JobDialog({
  mode = 'create',
  job,
  drivers = [],
  vehicles = [],
  customers = [],
  routes = [],
  subcontractors = [],
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  canViewIncome = true,
  canViewExpense = true,
  canAssign = true,
  canDelete = false,
  defaultDate
}: JobDialogProps) {
  const { branches, isAdmin } = useBranch()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'assign' | 'price' | 'history'>('info')
  const [internalMode, setInternalMode] = useState<'create' | 'edit'>(mode)
  const [locationDirectory, setLocationDirectory] = useState<Record<string, { lat: number | null, lon: number | null, phone: string | null }>>({})

  useEffect(() => {
    setInternalMode(mode)
  }, [mode])

  const isControlled = controlledOpen !== undefined
  const show = isControlled ? controlledOpen : open

  const [fuelPrice, setFuelPrice] = useState<number | null>(null)
  const [fuelPriceTomorrow, setFuelPriceTomorrow] = useState<number | null>(null)
  const [isSyncingFuel, setIsSyncingFuel] = useState(false)
  const [fuelError, setFuelError] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return;
    
    let isMounted = true;
    setIsSyncingFuel(true)
    
    const timeoutId = setTimeout(() => {
      if (isMounted) {
          setIsSyncingFuel(false)
          if (!fuelPrice) setFuelError('การเชื่อมต่อล่าช้า')
      }
    }, 15000);

    getFuelPrice()
      .then(data => {
        if (isMounted) {
            setFuelPrice(data.price)
            setFuelPriceTomorrow(data.priceTomorrow)
            if (!data.price) setFuelError('ไม่พบข้อมูลราคา')
        }
      })
      .catch(err => {
        if (isMounted) setFuelError(err.message)
      })

    // Fetch Location Directory
    getLocationDirectory().then(dir => {
        if (isMounted) setLocationDirectory(dir)
    })

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
    };
  }, [show]);

  const [formData, setFormData] = useState<Partial<Job>>({
    Job_ID: generateJobId(),
    Job_Status: 'Assigned',
    Plan_Date: defaultDate || new Date().toISOString().split('T')[0],
    Customer_ID: '',
    Route_Name: '',
    Origin_Location: '',
    Dest_Location: '',
    Cargo_Type: '',
    Notes: '',
    Price_Cust_Total: 0,
    Cost_Driver_Total: 0,
    Weight_Kg: null,
    Volume_Cbm: null,
    Zone: '',
    Branch_ID: ''
  })

  const [origins, setOrigins] = useState<LocationPoint[]>([{ name: '', lat: '', lng: '' }])
  const [destinations, setDestinations] = useState<LocationPoint[]>([{ name: '', lat: '', lng: '' }])
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([])
  const [assignments, setAssignments] = useState<JobAssignment[]>([{ 
    Vehicle_Type: '4-Wheel', 
    Vehicle_Plate: '', 
    Driver_ID: '', 
    Sub_ID: '', 
    Show_Price_To_Driver: true,
    Cost_Driver_Total: 0,
    Price_Cust_Total: 0
  }])

  useEffect(() => {
    if (job && internalMode === 'edit') {
      setFormData(job)
      
      let initialOrigins: LocationPoint[] = []
      if (job.original_origins_json) {
        initialOrigins = typeof job.original_origins_json === 'string' ? JSON.parse(job.original_origins_json) : job.original_origins_json
      } else {
        initialOrigins = [{ name: job.Origin_Location || '', lat: String(job.Pickup_Lat || ''), lng: String(job.Pickup_Lon || '') }]
      }
      setOrigins(initialOrigins)

      let initialDestinations: LocationPoint[] = []
      if (job.original_destinations_json) {
        initialDestinations = typeof job.original_destinations_json === 'string' ? JSON.parse(job.original_destinations_json) : job.original_destinations_json
      } else {
        initialDestinations = [{ name: job.Dest_Location || '', lat: String(job.Delivery_Lat || ''), lng: String(job.Delivery_Lon || '') }]
      }
      setDestinations(initialDestinations)

      if (job.extra_costs_json) {
        setExtraCosts(typeof job.extra_costs_json === 'string' ? JSON.parse(job.extra_costs_json) : job.extra_costs_json)
      } else {
        setExtraCosts([])
      }

      if (job.assignments && Array.isArray(job.assignments)) {
        setAssignments(job.assignments)
      } else {
        setAssignments([{ 
          Vehicle_Type: job.Vehicle_Type || '4-Wheel', 
          Vehicle_Plate: job.Vehicle_Plate || '', 
          Driver_ID: job.Driver_ID || '', 
          Sub_ID: job.Sub_ID || '',
          Show_Price_To_Driver: job.Show_Price_To_Driver ?? true,
          Cost_Driver_Total: job.Cost_Driver_Total || 0,
          Price_Cust_Total: job.Price_Cust_Total || 0
        }])
      }
    } else {
        setFormData({
            Job_ID: generateJobId(),
            Job_Status: 'Assigned',
            Plan_Date: defaultDate || new Date().toISOString().split('T')[0],
            Customer_ID: '',
            Route_Name: '',
            Origin_Location: '',
            Dest_Location: '',
            Cargo_Type: '',
            Notes: '',
            Price_Cust_Total: 0,
            Cost_Driver_Total: 0,
            Weight_Kg: null,
            Volume_Cbm: null,
            Zone: '',
            Branch_ID: ''
        })
        setOrigins([{ name: '', lat: '', lng: '' }])
        setDestinations([{ name: '', lat: '', lng: '' }])
        setExtraCosts([])
        setAssignments([{ 
            Vehicle_Type: '4-Wheel', 
            Vehicle_Plate: '', 
            Driver_ID: '', 
            Sub_ID: '', 
            Show_Price_To_Driver: true,
            Cost_Driver_Total: 0,
            Price_Cust_Total: 0
        }])
    }
  }, [job, internalMode, defaultDate])

  const addOrigin = () => setOrigins([...origins, { name: '', lat: '', lng: '' }])
  const removeOrigin = (index: number) => {
    if (origins.length > 1) setOrigins(origins.filter((_, i) => i !== index))
  }
  const updateOrigin = (index: number, field: keyof LocationPoint, value: string) => {
    setOrigins(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
    })
  }

  const handleOriginNameChange = (index: number, val: string) => {
    const name = val.trim();
    updateOrigin(index, 'name', name);

    if (name.startsWith('http')) {
        const coords = extractCoordsFromUrl(name);
        if (coords) {
            updateOrigin(index, 'lat', coords.lat.toString());
            updateOrigin(index, 'lng', coords.lng.toString());
            toast.success("ดึงพิกัดจาก Google Maps สำเร็จ");
            return;
        }
    }

    if (locationDirectory[name]) {
        const meta = locationDirectory[name];
        if (meta.lat) updateOrigin(index, 'lat', String(meta.lat));
        if (meta.lon) updateOrigin(index, 'lng', String(meta.lon));
        if (meta.phone) updateOrigin(index, 'phone', meta.phone);
        toast.success(`ดึงข้อมูลต้นทางมาสเตอร์: ${name}`);
        return;
    }

    const currentOrigin = origins[index];
    if (routes && routes.length > 0 && (!currentOrigin.lat || !currentOrigin.lng)) {
        const masterMatch = routes.find(r => r.Origin && r.Origin.trim() === name);
        if (masterMatch) {
            const lat = masterMatch.Origin_Lat;
            const lng = masterMatch.Origin_Lon;
            if (lat && lng) {
                updateOrigin(index, 'lat', lat.toString());
                updateOrigin(index, 'lng', lng.toString());
                toast.success(`ใช้พิกัดต้นทางจากมาสเตอร์: ${name}`);
            }
        }
    }
  }

  const addDestination = () => setDestinations([...destinations, { name: '', lat: '', lng: '' }])
  const removeDestination = (index: number) => {
    if (destinations.length > 1) setDestinations(destinations.filter((_, i) => i !== index))
  }
  const updateDestination = (index: number, field: keyof LocationPoint, value: string) => {
    setDestinations(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
    })
  }

  const optimizeRoute = () => {
    if (destinations.length <= 1) return;
    
    // 1. Get Starting Point (First Origin)
    const startPoint = {
        lat: parseFloat(origins[0]?.lat || '0'),
        lng: parseFloat(origins[0]?.lng || '0')
    }

    if (!startPoint.lat || !startPoint.lng) {
        toast.error("กรุณาระบุพิกัดต้นทางเพื่อใช้จัดลำดับ");
        return;
    }

    // 2. Simple Nearest Neighbor Algorithm
    let currentPoint = startPoint;
    const remaining = [...destinations].map((d, i) => ({ ...d, originalIndex: i }));
    const optimized: LocationPoint[] = [];

    const getDistance = (p1: { lat: number, lng: number }, p2: { lat: number, lng: number }) => {
        // Simple Euclidean distance for local optimization
        return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
    };

    while (remaining.length > 0) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        remaining.forEach((dest, idx) => {
            const destLat = parseFloat(dest.lat || '0');
            const destLng = parseFloat(dest.lng || '0');
            
            if (destLat && destLng) {
                const dist = getDistance(currentPoint, { lat: destLat, lng: destLng });
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIndex = idx;
                }
            }
        });

        // If no more valid points found, just add the rest as they are
        if (nearestIndex === -1) {
            optimized.push(...remaining.map(({ originalIndex, ...rest }) => rest));
            break;
        }

        const picked = remaining.splice(nearestIndex, 1)[0];
        const { originalIndex, ...destData } = picked;
        optimized.push(destData);
        currentPoint = { 
            lat: parseFloat(destData.lat || '0'), 
            lng: parseFloat(destData.lng || '0') 
        };
    }

    setDestinations(optimized);
    toast.success("จัดลำดับจุดส่งอัตโนมัติตามระยะทางเรียบร้อยแล้ว");
  }

  const handleDestinationNameChange = (index: number, val: string) => {
    const name = val.trim();
    updateDestination(index, 'name', name);

    if (name.startsWith('http')) {
        const coords = extractCoordsFromUrl(name);
        if (coords) {
            updateDestination(index, 'lat', coords.lat.toString());
            updateDestination(index, 'lng', coords.lng.toString());
            toast.success("ดึงพิกัดจาก Google Maps สำเร็จ");
            return;
        }
    }

    if (locationDirectory[name]) {
        const meta = locationDirectory[name];
        if (meta.lat) updateDestination(index, 'lat', String(meta.lat));
        if (meta.lon) updateDestination(index, 'lng', String(meta.lon));
        if (meta.phone) updateDestination(index, 'phone', meta.phone);
        toast.success(`ดึงข้อมูลปลายทางมาสเตอร์: ${name}`);
        return;
    }

    const currentDest = destinations[index];
    if (routes && routes.length > 0 && (!currentDest.lat || !currentDest.lng)) {
        const masterMatch = routes.find(r => r.Destination && r.Destination.trim() === name);
        if (masterMatch) {
            const lat = masterMatch.Dest_Lat;
            const lng = masterMatch.Dest_Lon;
            if (lat && lng) {
                updateDestination(index, 'lat', lat.toString());
                updateDestination(index, 'lng', lng.toString());
                toast.success(`ใช้พิกัดปลายทางจากมาสเตอร์: ${name}`);
            }
        }
    }
  }

  const addAssignment = () => {
    setAssignments([...assignments, { 
        Vehicle_Type: '4-Wheel', 
        Vehicle_Plate: '', 
        Driver_ID: '', 
        Sub_ID: '', 
        Show_Price_To_Driver: true,
        Cost_Driver_Total: formData.Cost_Driver_Total ? Number(formData.Cost_Driver_Total) : 0,
        Price_Cust_Total: formData.Price_Cust_Total ? Number(formData.Price_Cust_Total) : 0
    }])
  }

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) setAssignments(assignments.filter((_, i) => i !== index))
  }

  const updateAssignment = (index: number, field: keyof JobAssignment, value: any) => {
    setAssignments(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
    })
  }

  const handleSave = async () => {
    if (!formData.Job_ID || !formData.Customer_ID) {
      toast.error(t('jobs.dialog.error_required'))
      return
    }

    setLoading(true)
    try {
      const finalJobData = {
        ...formData,
        Origin_Location: origins.map(o => o.name).join(' → '),
        Dest_Location: destinations.map(d => d.name).join(' → '),
        original_origins_json: JSON.stringify(origins),
        original_destinations_json: JSON.stringify(destinations),
        extra_costs_json: JSON.stringify(extraCosts),
        assignments: assignments,
        Total_Drop: destinations.length,
        Pickup_Lat: origins[0]?.lat ? parseFloat(origins[0].lat) : null,
        Pickup_Lon: origins[0]?.lng ? parseFloat(origins[0].lng) : null,
        Delivery_Lat: destinations[destinations.length - 1]?.lat ? parseFloat(destinations[destinations.length - 1].lat) : null,
        Delivery_Lon: destinations[destinations.length - 1]?.lng ? parseFloat(destinations[destinations.length - 1].lng) : null,
      }

      const result = await updateJob(finalJobData as Job)
      if (result.success) {
        toast.success(internalMode === 'edit' ? t('jobs.dialog.update_success') : t('jobs.dialog.create_success'))
        if (isControlled) setControlledOpen?.(false)
        else setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={isControlled ? setControlledOpen : setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="bg-background border border-border/5 text-foreground max-w-5xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[4rem] p-0 overflow-hidden ring-1 ring-white/10">
        <div className="bg-card p-10 text-foreground relative overflow-hidden border-b border-border/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <DialogHeader>
                <DialogTitle className="text-4xl font-black tracking-tighter flex items-center justify-between uppercase premium-text-gradient">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-primary/20 rounded-2xl shadow-xl ring-1 ring-primary/30">
                            <Truck size={32} className="text-primary" strokeWidth={2.5} />
                        </div>
                        {internalMode === 'edit' ? t('jobs.dialog.edit_title') : t('jobs.dialog.create_title')}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-4 py-1.5 bg-muted/50 rounded-full border border-border/10 text-xs font-bold tracking-widest text-muted-foreground uppercase italic">
                            {formData.Job_ID}
                        </div>
                    </div>
                </DialogTitle>
            </DialogHeader>
        </div>

        <div className="flex border-b border-border/5 bg-muted/20">
            {[
                { id: 'info', label: t('jobs.dialog.tab_info'), icon: Info },
                { id: 'location', label: t('jobs.dialog.tab_location'), icon: MapPin },
                { id: 'assign', label: t('jobs.dialog.tab_assign'), icon: User },
                { id: 'price', label: t('jobs.dialog.tab_price'), icon: Banknote },
                { id: 'history', label: t('jobs.dialog.tab_history'), icon: History }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-5 text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
                        activeTab === tab.id 
                            ? "text-primary bg-primary/5 font-black" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                >
                    <tab.icon size={14} strokeWidth={3} />
                    {tab.label}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(255,30,133,0.5)]" />
                    )}
                </button>
            ))}
        </div>

        <div className="p-10 custom-scrollbar max-h-[70vh] overflow-y-auto">
            {activeTab === 'info' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-primary text-sm font-black uppercase tracking-widest ml-2">{t('jobs.dialog.customer')}</Label>
                            <CustomerAutocomplete
                                value={formData.Customer_ID || ""}
                                onChange={(val) => setFormData({ ...formData, Customer_ID: val })}
                                customers={customers}
                                className="bg-background border-primary/20 text-xl h-14"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-primary text-sm font-black uppercase tracking-widest ml-2">{t('jobs.dialog.plan_date')}</Label>
                            <Input
                                type="date"
                                value={formData.Plan_Date || ""}
                                onChange={(e) => setFormData({ ...formData, Plan_Date: e.target.value })}
                                className="bg-background border-primary/20 text-xl h-14 uppercase font-black"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-primary text-sm font-black uppercase tracking-widest ml-2">{t('jobs.dialog.cargo_type')}</Label>
                            <Input
                                value={formData.Cargo_Type || ""}
                                onChange={(e) => setFormData({ ...formData, Cargo_Type: e.target.value })}
                                placeholder={t('jobs.dialog.cargo_type')}
                                className="bg-background border-primary/20 text-xl h-14"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-primary text-sm font-black uppercase tracking-widest ml-2">{t('jobs.dialog.notes')}</Label>
                            <Textarea
                                value={formData.Notes || ""}
                                onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                                placeholder={t('jobs.dialog.notes')}
                                className="bg-background border-primary/20"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'location' && (
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <Label className="text-primary text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <MapPin size={24} /> {t('jobs.dialog.origin')} ({origins.length})
                            </Label>
                            <Button onClick={addOrigin} variant="outline" size="sm" className="rounded-full border-primary/30 text-primary hover:bg-primary/10">
                                <Plus size={16} className="mr-1" /> {t('jobs.dialog.add_origin')}
                            </Button>
                        </div>
                        {origins.map((origin, idx) => (
                            <div key={idx} className="p-6 bg-muted/20 rounded-3xl border border-border/5 space-y-4 relative group">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 md:col-span-6">
                                        <LocationAutocomplete
                                            value={origin.name}
                                            onChange={(val) => handleOriginNameChange(idx, val)}
                                            locations={Array.from(new Set(routes.map(r => r.Origin).filter(Boolean))) as string[]}
                                            placeholder={t('jobs.dialog.origin_placeholder')}
                                            className="h-12 text-lg"
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Input
                                            placeholder="Lat"
                                            value={origin.lat}
                                            onChange={(e) => updateOrigin(idx, 'lat', e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Input
                                            placeholder="Lng"
                                            value={origin.lng}
                                            onChange={(e) => updateOrigin(idx, 'lng', e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Input
                                            placeholder="Phone"
                                            value={origin.phone || ""}
                                            onChange={(e) => updateOrigin(idx, 'phone', e.target.value)}
                                            className="h-12 border-primary/30 text-primary"
                                        />
                                    </div>
                                </div>
                                {origins.length > 1 && (
                                    <button 
                                        onClick={() => removeOrigin(idx)}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4 pt-8">
                            <Label className="text-indigo-400 text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <MapPin size={24} /> {t('jobs.dialog.destination')} ({destinations.length})
                            </Label>
                             <div className="flex items-center gap-2">
                                {destinations.length > 1 && (
                                    <Button 
                                        onClick={optimizeRoute} 
                                        variant="outline" 
                                        size="sm" 
                                        className="rounded-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 gap-2"
                                    >
                                        <Zap size={14} /> {t('jobs.dialog.optimize_route') || 'จัดลำดับจุดส่งอัตโนมัติ'}
                                    </Button>
                                )}
                                <Button onClick={addDestination} variant="outline" size="sm" className="rounded-full border-indigo-400/30 text-indigo-400 hover:bg-indigo-400/10">
                                    <Plus size={16} className="mr-1" /> {t('jobs.dialog.add_destination')}
                                </Button>
                             </div>
                        </div>
                        {destinations.map((dest, idx) => (
                            <div key={idx} className="p-6 bg-muted/20 rounded-3xl border border-border/5 space-y-4 relative group">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 md:col-span-6">
                                        <LocationAutocomplete
                                            value={dest.name}
                                            onChange={(val) => handleDestinationNameChange(idx, val)}
                                            locations={Array.from(new Set(routes.map(r => r.Destination).filter(Boolean))) as string[]}
                                            placeholder={t('jobs.dialog.destination_placeholder')}
                                            className="h-12 text-lg"
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Input
                                            placeholder="Lat"
                                            value={dest.lat}
                                            onChange={(e) => updateDestination(idx, 'lat', e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Input
                                            placeholder="Lng"
                                            value={dest.lng}
                                            onChange={(e) => updateDestination(idx, 'lng', e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <Input
                                            placeholder="Phone"
                                            value={dest.phone || ""}
                                            onChange={(e) => updateDestination(idx, 'phone', e.target.value)}
                                            className="h-12 border-indigo-400/30 text-indigo-400"
                                        />
                                    </div>
                                </div>
                                {destinations.length > 1 && (
                                    <button 
                                        onClick={() => removeDestination(idx)}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'assign' && (
                <div className="space-y-6">
                    {assignments.map((assignment, idx) => (
                        <div key={idx} className="p-8 bg-muted/20 rounded-[3rem] border border-border/5 space-y-8 relative group">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Vehicle Type</Label>
                                    <Select value={assignment.Vehicle_Type} onValueChange={(val) => updateAssignment(idx, 'Vehicle_Type', val)}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="4-Wheel">4-Wheel</SelectItem>
                                            <SelectItem value="6-Wheel">6-Wheel</SelectItem>
                                            <SelectItem value="10-Wheel">10-Wheel</SelectItem>
                                            <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Plate / Name</Label>
                                    <VehicleAutocomplete
                                        value={assignment.Vehicle_Plate}
                                        onChange={(val) => updateAssignment(idx, 'Vehicle_Plate', val)}
                                        vehicles={vehicles}
                                        className="h-14 rounded-2xl bg-background"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Driver</Label>
                                    <DriverAutocomplete
                                        value={assignment.Driver_ID}
                                        onChange={(val) => updateAssignment(idx, 'Driver_ID', val)}
                                        drivers={drivers}
                                        className="h-14 rounded-2xl bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'price' && (
                <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 space-y-4">
                            <Label className="text-emerald-500 text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <Banknote size={24} /> {t('jobs.dialog.customer_price')}
                            </Label>
                            <Input
                                type="number"
                                value={formData.Price_Cust_Total || 0}
                                onChange={(e) => setFormData({ ...formData, Price_Cust_Total: Number(e.target.value) })}
                                className="h-16 text-2xl font-black text-emerald-600 dark:text-emerald-400 bg-background border-emerald-500/20"
                            />
                        </div>
                        <div className="p-8 bg-rose-500/5 rounded-3xl border border-rose-500/10 space-y-4">
                            <Label className="text-rose-500 text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                <Banknote size={24} /> {t('jobs.dialog.driver_cost')}
                            </Label>
                            <Input
                                type="number"
                                value={formData.Cost_Driver_Total || 0}
                                onChange={(e) => setFormData({ ...formData, Cost_Driver_Total: Number(e.target.value) })}
                                className="h-16 text-2xl font-black text-rose-600 dark:text-rose-400 bg-background border-rose-500/20"
                            />
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="py-10">
                    {internalMode === 'edit' && job ? (
                        <JobTimeline job={job} />
                    ) : (
                        <div className="text-center py-20 text-muted-foreground font-black uppercase tracking-widest opacity-50">
                            {t('jobs.dialog.no_history')}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-10 border-t border-border/5 flex gap-4 bg-muted/20">
            <PremiumButton 
                onClick={handleSave} 
                disabled={loading}
                className="flex-[2] h-20 rounded-[2.5rem] bg-primary text-foreground text-xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (internalMode === 'edit' ? t('common.save_changes') : t('common.create_now'))}
            </PremiumButton>
            <Button 
                variant="outline" 
                onClick={() => isControlled ? setControlledOpen?.(false) : setOpen(false)}
                className="flex-1 h-20 rounded-[2.5rem] border-border/10 text-muted-foreground font-black uppercase tracking-widest text-sm hover:bg-muted/50 transition-all"
            >
                {t('common.cancel')}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
