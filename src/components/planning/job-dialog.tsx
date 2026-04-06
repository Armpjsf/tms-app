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
  Plus, Search as SearchIcon, Settings as SettingsIcon, ShieldCheck, Trash2, 
  Truck, User, X, Zap 
} from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/providers/language-provider"

import { Job, JobAssignment } from "@/lib/supabase/jobs"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"
import { getFuelPrice, getSuggestedRate } from "@/lib/actions/fuel-actions"
import { getVehicleTypes, VehicleType as MasterVehicleType } from "@/lib/actions/vehicle-type-actions"
import { JobTimeline } from "./job-timeline"

type LocationPoint = {
  name: string
  lat: string
  lng: string
}

type ExtraCost = {
  type: string
  cost_driver: number   // จ่ายให้รถ
  charge_cust: number   // เก็บจากลูกค้า
}

type JobDialogProps = {
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
  canViewPrice?: boolean
  canDelete?: boolean
  defaultDate?: string
}

// Common expense types
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
  canViewPrice = true,
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

  // Sync internalMode state with mode prop if it changes
  useEffect(() => {
    setInternalMode(mode)
  }, [mode])

  // Initial Fuel Fetch
  useEffect(() => {
    let isMounted = true;
    setIsSyncingFuel(true)
    
    // Add a client-side safety timeout to prevent "stuck" UI
    const timeoutId = setTimeout(() => {
      if (isMounted) {
          setIsSyncingFuel(false)
          if (!fuelPrice) setFuelError('การเชื่อมต่อล่าช้า')
      }
    }, 15000);

    getFuelPrice()
      .then(price => {
        if (isMounted) {
            setFuelPrice(price)
            if (!price) setFuelError('ไม่พบข้อมูลราคา')
        }
      })
      .catch(err => {
        if (isMounted) setFuelError(err.message)
      })
      .finally(() => {
        if (isMounted) {
            setIsSyncingFuel(false)
            clearTimeout(timeoutId)
        }
      })
    
    return () => { isMounted = false; clearTimeout(timeoutId); }
  }, [])
  
  const isControlled = controlledOpen !== undefined
  const show = isControlled ? controlledOpen : open
  const setShow = isControlled ? setControlledOpen! : setOpen
  const [copied, setCopied] = useState(false)

  // 1. Helper to safely parse JSON (Must be defined before state initialization)
  const parseJson = (val: string | unknown[] | Record<string, any> | null | undefined, defaultVal: any) => {
    if (!val) return defaultVal
    if (Array.isArray(val)) return val
    if (typeof val === 'object' && val !== null) return [val] // Wrap single object as array if needed
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return defaultVal
      }
    }
    return defaultVal
  }

  // 2. State Declarations
  const [formData, setFormData] = useState({
    Job_ID: job?.Job_ID || '', // Empty for new jobs to allow manual entry or auto-gen
    Plan_Date: job?.Pickup_Date || job?.Plan_Date || defaultDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
    Delivery_Date: job?.Delivery_Date || defaultDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
    Customer_ID: job?.Customer_ID || '',
    Customer_Name: job?.Customer_Name || '',
    Route_Name: job?.Route_Name || '', // Not used directly in UI but kept for compatibility
    
    // Legacy single assignment fields (will be syncing with first assignment or ignored in multi-mode)
    Driver_ID: job?.Driver_ID || '',
    Vehicle_Plate: job?.Vehicle_Plate || '',
    Vehicle_Type: job?.Vehicle_Type || '4-Wheel',

    Cargo_Type: job?.Cargo_Type || '',
    Notes: job?.Notes || '',
    Price_Cust_Total: job?.Price_Cust_Total || 0,
    Cost_Driver_Total: job?.Cost_Driver_Total || 0,
    Job_Status: job?.Job_Status || 'New',
    Weight_Kg: job?.Weight_Kg || 0,
    Volume_Cbm: job?.Volume_Cbm || 0,
    Zone: job?.Zone || '',
    Branch_ID: job?.Branch_ID || '',
    Delivery_Lat: job?.Delivery_Lat || null,
    Delivery_Lon: job?.Delivery_Lon || null,
    Sub_ID: job?.Sub_ID || '',
    Show_Price_To_Driver: job?.Show_Price_To_Driver !== false,
    Est_Distance_KM: job?.Est_Distance_KM || 0,
    Price_Cust_Extra: job?.Price_Cust_Extra || 0,
    Cost_Driver_Extra: job?.Cost_Driver_Extra || 0,
  })

  // Multi-point origins
  const [origins, setOrigins] = useState<LocationPoint[]>(() => {
    const fromJson = parseJson((job?.origins || job?.original_origins_json) as string | unknown[], []) as LocationPoint[]
    if (fromJson && fromJson.length > 0) return fromJson
    
    // Fallback for requested jobs which save as plain strings
    if (job?.Origin_Location) {
        return [{ name: job.Origin_Location, lat: '', lng: '' }]
    }
    return [{ name: '', lat: '', lng: '' }]
  })

  // Multi-point destinations
  const [destinations, setDestinations] = useState<LocationPoint[]>(() => {
    const fromJson = parseJson((job?.destinations || job?.original_destinations_json) as string | unknown[], []) as LocationPoint[]
    if (fromJson && fromJson.length > 0) return fromJson
    
    // Fallback for requested jobs which save as plain strings
    if (job?.Dest_Location) {
        return [{ name: job.Dest_Location, lat: '', lng: '' }]
    }
    return [{ name: '', lat: '', lng: '' }]
  })

  // Multi-Assignment State
  const [assignments, setAssignments] = useState<JobAssignment[]>(
    job?.assignments && job.assignments.length > 0
      ? job.assignments
      : [{ 
          Vehicle_Type: '4-Wheel', 
          Vehicle_Plate: '', 
          Driver_ID: '', 
          Sub_ID: '', 
          Show_Price_To_Driver: true,
          Cost_Driver_Total: job?.Cost_Driver_Total ? Number(job.Cost_Driver_Total) : 0,
          Price_Cust_Total: job?.Price_Cust_Total ? Number(job.Price_Cust_Total) : 0
        }]
  )

  // Extra costs
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>(
    parseJson((job?.extra_costs || job?.extra_costs_json) as string | unknown[], []) as ExtraCost[]
  )

  // Fuel Suggestion State
  const [fuelPrice, setFuelPrice] = useState<number | null>(null)
  const [isSyncingFuel, setIsSyncingFuel] = useState(false)
  const [fuelError, setFuelError] = useState<string | null>(null)
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null)
  const [checkingRate, setCheckingRate] = useState(false)
  const [masterVehicleTypes, setMasterVehicleTypes] = useState<MasterVehicleType[]>([])

  // 3. Effects (Must be after state declarations)
  // Fetch master vehicle types
  useEffect(() => {
    getVehicleTypes().then(types => {
      setMasterVehicleTypes(types || [])
    })
  }, [])
  // Fetch fuel price for plan date
  useEffect(() => {
    if (show && formData.Plan_Date) {
        getFuelPrice(formData.Plan_Date).then(price => {
            setFuelPrice(price)
        })
    }
  }, [show, formData.Plan_Date])

  // Check for suggested rate
  useEffect(() => {
    const origin = origins[0]
    const destination = destinations[destinations.length - 1]
    
    if (formData.Customer_ID && origin?.name && destination?.name && fuelPrice) {
      // Find the official route name (e.g. BARSEALE1) from Master_Routes
      // instead of using a naive concatenation.
      const officialRoute = routes.find(r => 
        (r.Origin?.trim() === origin.name.trim() && r.Destination?.trim() === destination.name.trim()) ||
        (r.Route_Name === `${origin.name.trim()} - ${destination.name.trim()}`)
      )
      
      const routeLookupName = officialRoute ? officialRoute.Route_Name : `${origin.name.trim()} - ${destination.name.trim()}`
      
      setCheckingRate(true)
      getSuggestedRate(formData.Customer_ID, routeLookupName, fuelPrice, formData.Vehicle_Type)
        .then(rate => {
            setSuggestedRate(rate)
            setCheckingRate(false)
        })
    } else {
        setSuggestedRate(null)
    }
  }, [formData.Customer_ID, formData.Vehicle_Type, origins, destinations, fuelPrice, routes])

  // Job Bundling State
  const [nearbyJobs, setNearbyJobs] = useState<Array<{ Job_ID: string; Customer_Name: string | null }>>([])

  // Merged sync logic below handles both create and edit modes robustly.

  // Fetch nearby unassigned jobs when origin coordinates available
  useEffect(() => {
    const fetchNearby = async () => {
        if (origins[0]?.lat && origins[0]?.lng) {
            const { getNearbyUnassignedJobs } = await import('@/lib/ai/ai-assign')
            const jobs = await getNearbyUnassignedJobs({
                Job_ID: formData.Job_ID,
                Pickup_Lat: Number(origins[0].lat),
                Pickup_Lon: Number(origins[0].lng)
            })
            setNearbyJobs(jobs)
        }
    }
    if (show && internalMode === 'create') fetchNearby()
  }, [origins, formData.Job_ID, show, internalMode])

  // AUTO-DISTANCE: Trigger calculation when endpoints have valid coordinates
  useEffect(() => {
    const calculateDistance = async () => {
        // Collect all points from origins and destinations in order
        const points = [
            ...origins.filter(o => o.lat && o.lng).map(o => ({ lat: Number(o.lat), lng: Number(o.lng) })),
            ...destinations.filter(d => d.lat && d.lng).map(d => ({ lat: Number(d.lat), lng: Number(d.lng) }))
        ]
        
        // Only trigger if we have at least 2 valid points (one origin, one destination)
        if (points.length >= 2) {
            const dist = await getDrivingDistance(points)
            if (dist !== null) {
                setFormData(prev => ({ ...prev, Est_Distance_KM: dist }))
            }
        }
    }
    if (show) calculateDistance()
  }, [origins, destinations, show])

  // Comprehensive State Sync when dialog opens in Edit Mode
  // Centralized State Sync: Handles Create/Edit transitions and Data Population
  useEffect(() => {
    if (!show) return;

    console.log('[JobDialog DEBUG] Sync Triggered', { internalMode, jobId: job?.Job_ID, show });

    if (internalMode === 'edit' && job) {
      console.log('[JobDialog DEBUG] Syncing EDIT Data for', job.Job_ID);
      
      // A. Sync Locations
      const rawOrigins = (job.origins || job.original_origins_json)
      let parsedOrigins = parseJson(rawOrigins, []) as LocationPoint[]
      if (parsedOrigins.length === 0 && job.Origin_Location) {
        parsedOrigins = [{ name: job.Origin_Location, lat: job.Pickup_Lat?.toString() || '', lng: job.Pickup_Lon?.toString() || '' }]
      }
      if (parsedOrigins.length === 0) parsedOrigins = [{ name: '', lat: '', lng: '' }]
      setOrigins(parsedOrigins)

      const rawDestinations = (job.destinations || job.original_destinations_json)
      let parsedDestinations = parseJson(rawDestinations, []) as LocationPoint[]
      if (parsedDestinations.length === 0 && job.Dest_Location) {
        parsedDestinations = [{ name: job.Dest_Location, lat: job.Delivery_Lat?.toString() || '', lng: job.Delivery_Lon?.toString() || '' }]
      }
      if (parsedDestinations.length === 0) parsedDestinations = [{ name: '', lat: '', lng: '' }]
      setDestinations(parsedDestinations)

      // B. Sync Extra Costs
      const rawCosts = (job.extra_costs || job.extra_costs_json)
      setExtraCosts(parseJson(rawCosts, []) as ExtraCost[])

      // C. Sync Assignments & Form Data Atomically
      const initialAssignments = job.assignments && job.assignments.length > 0
        ? job.assignments
        : [{
            Vehicle_Plate: job.Vehicle_Plate || '',
            Vehicle_Type: job.Vehicle_Type || '4-Wheel',
            Driver_ID: job.Driver_ID || '',
            Sub_ID: job.Sub_ID || '',
            Show_Price_To_Driver: job.Show_Price_To_Driver !== false,
            Price_Cust_Total: job.Price_Cust_Total !== null ? Number(job.Price_Cust_Total) : 0,
            Cost_Driver_Total: job.Cost_Driver_Total !== null ? Number(job.Cost_Driver_Total) : 0,
          }]
      setAssignments(initialAssignments)

      const firstAssign = initialAssignments[0]
      const newFormData = {
        Job_ID: job.Job_ID || '',
        Plan_Date: job.Plan_Date || job.Pickup_Date || defaultDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
        Delivery_Date: job.Delivery_Date || defaultDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
        Customer_ID: job.Customer_ID || '',
        Customer_Name: job.Customer_Name || '',
        Route_Name: job.Route_Name || '',
        Driver_ID: firstAssign.Driver_ID || job.Driver_ID || '', // Fallback to core job field
        Vehicle_Plate: firstAssign.Vehicle_Plate || job.Vehicle_Plate || '', // Fallback to core job field
        Vehicle_Type: firstAssign.Vehicle_Type || job.Vehicle_Type || '4-Wheel',
        Sub_ID: firstAssign.Sub_ID || job.Sub_ID || '',
        Price_Cust_Total: firstAssign.Price_Cust_Total !== undefined ? firstAssign.Price_Cust_Total : (job.Price_Cust_Total !== null ? Number(job.Price_Cust_Total) : 0),
        Cost_Driver_Total: firstAssign.Cost_Driver_Total !== undefined ? firstAssign.Cost_Driver_Total : (job.Cost_Driver_Total !== null ? Number(job.Cost_Driver_Total) : 0),
        Price_Cust_Extra: job.Price_Cust_Extra !== null && job.Price_Cust_Extra !== undefined ? Number(job.Price_Cust_Extra) : 0,
        Cost_Driver_Extra: job.Cost_Driver_Extra !== null && job.Cost_Driver_Extra !== undefined ? Number(job.Cost_Driver_Extra) : 0,
        Cargo_Type: job.Cargo_Type || '',
        Notes: job.Notes || '',
        Job_Status: job.Job_Status || 'New',
        Weight_Kg: job.Weight_Kg !== null && job.Weight_Kg !== undefined ? Number(job.Weight_Kg) : 0,
        Volume_Cbm: job.Volume_Cbm !== null && job.Volume_Cbm !== undefined ? Number(job.Volume_Cbm) : 0,
        Est_Distance_KM: job.Est_Distance_KM !== null && job.Est_Distance_KM !== undefined ? Number(job.Est_Distance_KM) : 0,
        Zone: job.Zone || '',
        Branch_ID: job.Branch_ID || '',
        Show_Price_To_Driver: firstAssign.Show_Price_To_Driver ?? job.Show_Price_To_Driver ?? true,
        Delivery_Lat: job.Delivery_Lat || null,
        Delivery_Lon: job.Delivery_Lon || null,
      }
      console.log('[JobDialog DEBUG] Setting formData:', newFormData);
      setFormData(newFormData);

    } else if (internalMode === 'create' && !job) {
      console.log('[JobDialog DEBUG] Syncing CREATE Data');
      setFormData({
        Job_ID: '',
        Plan_Date: defaultDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
        Delivery_Date: defaultDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
        Customer_ID: '',
        Customer_Name: '',
        Route_Name: '',
        Driver_ID: '',
        Vehicle_Plate: '',
        Vehicle_Type: '4-Wheel',
        Sub_ID: '',
        Price_Cust_Total: 0,
        Cost_Driver_Total: 0,
        Price_Cust_Extra: 0,
        Cost_Driver_Extra: 0,
        Cargo_Type: '',
        Notes: '',
        Job_Status: 'New',
        Weight_Kg: 0,
        Volume_Cbm: 0,
        Est_Distance_KM: 0,
        Zone: '',
        Branch_ID: '',
        Show_Price_To_Driver: true,
        Delivery_Lat: null,
        Delivery_Lon: null,
      })
      setOrigins([{ name: '', lat: '', lng: '' }])
      setDestinations([{ name: '', lat: '', lng: '' }])
      setExtraCosts([])
      setAssignments([{ Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '', Sub_ID: '', Show_Price_To_Driver: true, Cost_Driver_Total: 0, Price_Cust_Total: 0 }])
    }
  }, [show, internalMode, job?.Job_ID, defaultDate])


  const handleDuplicate = () => {
    setInternalMode('create')
    setFormData(prev => ({
        ...prev,
        Job_ID: generateJobId(),
        Job_Status: 'New',
        Driver_ID: '',
        Vehicle_Plate: '',
        Vehicle_Type: job?.Vehicle_Type || '4-Wheel'
    }))
    setAssignments([{ 
        Vehicle_Type: job?.Vehicle_Type || '4-Wheel', 
        Vehicle_Plate: '', 
        Driver_ID: '', 
        Sub_ID: '', 
        Show_Price_To_Driver: true,
        Cost_Driver_Total: job?.Cost_Driver_Total ? Number(job.Cost_Driver_Total) : 0,
        Price_Cust_Total: job?.Price_Cust_Total ? Number(job.Price_Cust_Total) : 0
    }])
    setActiveTab('assign')
    // Assuming 'toast' is defined elsewhere or meant to be a placeholder for a notification system
    // toast.success("คัดลอกข้อมูลงานเรียบร้อยแล้ว กรุณามอบหมายคนขับสำหรับงานใหม่")
  }

  const handleCopyTrackingLink = () => {
    const origin = window.location.origin
    const url = `${origin}/track/${formData.Job_ID}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGeocodeOrigin = async (index: number) => {
    const origin = origins[index]
    if (!origin.name) return
    setLoading(true)
    try {
      // Get zone name as context if available
      const zoneName = ZONES.find(z => z.id === formData.Zone)?.name || formData.Zone
      const res = await geocodeAddress(origin.name, zoneName)
      if (res) {
        updateOrigin(index, 'lat', res.lat.toString())
        updateOrigin(index, 'lng', res.lng.toString())
      } else {
        toast.info(t('jobs.dialog.location_not_found'))
      }
    } catch {
      // Geocoding error
    } finally {
      setLoading(false)
    }
  }

  const handleGeocodeDestination = async (index: number) => {
    const dest = destinations[index]
    if (!dest.name) return
    setLoading(true)
    try {
      // Get zone name as context if available
      const zoneName = ZONES.find(z => z.id === formData.Zone)?.name || formData.Zone
      const res = await geocodeAddress(dest.name, zoneName)
      if (res) {
        updateDestination(index, 'lat', res.lat.toString())
        updateDestination(index, 'lng', res.lng.toString())
      } else {
        toast.info(t('jobs.dialog.location_not_found'))
      }
    } catch {
      // Geocoding error
    } finally {
      setLoading(false)
    }
  }

  


  const addOrigin = () => setOrigins([...origins, { name: '', lat: '', lng: '' }])
  const removeOrigin = (index: number) => {
    if (origins.length > 1) setOrigins(origins.filter((_, i) => i !== index))
  }
  const updateOrigin = (index: number, field: keyof LocationPoint, value: string) => {
    const updated = [...origins]
    updated[index][field] = value
    setOrigins(updated)
  }

  const handleOriginNameChange = (index: number, val: string) => {
    const name = val.trim();
    updateOrigin(index, 'name', name);

    // 1. Direct URL Detection & Extraction
    if (name.startsWith('http')) {
        const coords = extractCoordsFromUrl(name);
        if (coords) {
            updateOrigin(index, 'lat', coords.lat.toString());
            updateOrigin(index, 'lng', coords.lng.toString());
            toast.success("ดึงพิกัดจาก Google Maps สำเร็จ");
            return;
        }
    }

    // 2. Master Route Lookup
    if (routes && routes.length > 0) {
        // Find if this name matches an Origin or Destination in our master list
        const masterMatch = routes.find(r => 
            (r.Origin && r.Origin.trim() === name) || 
            (r.Destination && r.Destination.trim() === name)
        );

        if (masterMatch) {
            const isOriginMatch = masterMatch.Origin?.trim() === name;
            const lat = isOriginMatch ? masterMatch.Origin_Lat : masterMatch.Dest_Lat;
            const lng = isOriginMatch ? masterMatch.Origin_Lon : masterMatch.Dest_Lon;
            const link = isOriginMatch ? masterMatch.Map_Link_Origin : masterMatch.Map_Link_Destination;

            if (lat && lng) {
                updateOrigin(index, 'lat', lat.toString());
                updateOrigin(index, 'lng', lng.toString());
                toast.success(`ใช้พิกัดจากมาสเตอร์: ${name}`);
            } else if (link) {
                // Fallback to extraction from link in master data
                const coords = extractCoordsFromUrl(link);
                if (coords) {
                    updateOrigin(index, 'lat', coords.lat.toString());
                    updateOrigin(index, 'lng', coords.lng.toString());
                    toast.success(`ดึงพิกัดจากลิงก์มาสเตอร์: ${name}`);
                }
            }
        }
    }
  }

  const addDestination = () => setDestinations([...destinations, { name: '', lat: '', lng: '' }])
  const removeDestination = (index: number) => {
    if (destinations.length > 1) setDestinations(destinations.filter((_, i) => i !== index))
  }
  const updateDestination = (index: number, field: keyof LocationPoint, value: string) => {
    const updated = [...destinations]
    updated[index][field] = value
    setDestinations(updated)
  }

  const handleDestinationNameChange = (index: number, val: string) => {
    const name = val.trim();
    updateDestination(index, 'name', name);

    // 1. Direct URL Detection & Extraction
    if (name.startsWith('http')) {
        const coords = extractCoordsFromUrl(name);
        if (coords) {
            updateDestination(index, 'lat', coords.lat.toString());
            updateDestination(index, 'lng', coords.lng.toString());
            toast.success("ดึงพิกัดจาก Google Maps สำเร็จ");
            return;
        }
    }

    // 2. Master Route Lookup
    if (routes && routes.length > 0) {
        const masterMatch = routes.find(r => 
            (r.Destination && r.Destination.trim() === name) || 
            (r.Origin && r.Origin.trim() === name)
        );

        if (masterMatch) {
            const isDestMatch = masterMatch.Destination?.trim() === name;
            const lat = isDestMatch ? masterMatch.Dest_Lat : masterMatch.Origin_Lat;
            const lng = isDestMatch ? masterMatch.Dest_Lon : masterMatch.Origin_Lon;
            const link = isDestMatch ? masterMatch.Map_Link_Destination : masterMatch.Map_Link_Origin;

            if (lat && lng) {
                updateDestination(index, 'lat', lat.toString());
                updateDestination(index, 'lng', lng.toString());
                toast.success(`ใช้พิกัดจากมาสเตอร์: ${name}`);
            } else if (link) {
                // Fallback to extraction from link in master data
                const coords = extractCoordsFromUrl(link);
                if (coords) {
                    updateDestination(index, 'lat', coords.lat.toString());
                    updateDestination(index, 'lng', coords.lng.toString());
                    toast.success(`ดึงพิกัดจากลิงก์มาสเตอร์: ${name}`);
                }
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
    if (assignments.length > 1) {
        setAssignments(assignments.filter((_, i) => i !== index))
    }
  }

  const updateAssignment = (index: number, field: keyof JobAssignment, value: string | boolean | number) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], [field]: value } as JobAssignment
    
    // AUTO-CAPACITY LOGIC: If vehicle type changes and current values are 0, auto-fill from standard capacities
    if (field === 'Vehicle_Type' && typeof value === 'string') {
        const capacity = VEHICLE_CAPACITIES[value]
        if (capacity) {
            // Only update Weight if currently 0 or default
            if (Number(formData.Weight_Kg) === 0) {
                setFormData(prev => ({ ...prev, Weight_Kg: capacity.weight }))
            }
            // Only update Volume if currently 0 or default
            if (Number(formData.Volume_Cbm) === 0) {
                setFormData(prev => ({ ...prev, Volume_Cbm: capacity.volume }))
            }
        }
    }

    setAssignments(newAssignments)
    
    // Sync first assignment to main form data for backward compatibility / validation
    if (index === 0 && (typeof value === 'string' || typeof value === 'number')) {
        setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const addExtraCost = () => {
    setExtraCosts([...extraCosts, { type: 'Other', cost_driver: 0, charge_cust: 0 }])
  }

  const handleEditRates = () => {
    if (!formData.Customer_ID) {
      toast.error("โปรดเลือกลูกค้าก่อน")
      return
    }
    
    // Find route name logic copied from suggested rate effect
    const origin = origins[0]
    const destination = destinations[destinations.length - 1]
    let routeParam = ""
    
    if (origin?.name && destination?.name) {
      const officialRoute = routes.find(r => 
        (r.Origin?.trim() === origin.name.trim() && r.Destination?.trim() === destination.name.trim()) ||
        (r.Route_Name === `${origin.name.trim()} - ${destination.name.trim()}`)
      )
      routeParam = officialRoute ? officialRoute.Route_Name : `${origin.name.trim()} - ${destination.name.trim()}`
    }

    const url = `/settings/customers?id=${formData.Customer_ID}&tab=fuel-matrix${routeParam ? `&route=${encodeURIComponent(routeParam)}` : ''}${formData.Vehicle_Type ? `&vtype=${encodeURIComponent(formData.Vehicle_Type)}` : ''}`
    window.open(url, '_blank')
  }

  const removeExtraCost = (index: number) => setExtraCosts(extraCosts.filter((_, i) => i !== index))
  const updateExtraCost = (index: number, field: keyof ExtraCost, value: string | number) => {
    const updated = [...extraCosts]
    if (field === 'cost_driver' || field === 'charge_cust') {
      updated[index][field] = Number(value)
    } else {
      updated[index][field] = value as string
    }
    setExtraCosts(updated)
  }


  const validateForm = () => {
    const errors: string[] = []

    if (!formData.Customer_Name) errors.push(t('jobs.dialog.customer_required'))
    if (!origins[0].name) errors.push(t('jobs.dialog.origin_required'))
    if (!destinations[0].name) errors.push(t('jobs.dialog.dest_required'))
    
    // Check assignments - Relaxed for bidding system (Optional driver/vehicle)
    return errors
  }

  const handleDelete = async () => {
    if (!job?.Job_ID) return
    if (!confirm(t('jobs.dialog.confirm_delete'))) return
    
    setLoading(true)
    try {
        const result = await deleteJob(job.Job_ID)
        if (!result.success) throw new Error(result.message)
        setShow(false)
        toast.success(t('jobs.dialog.delete_success'))
        router.refresh()
    } catch {
        // Delete error
        toast.error(t('jobs.dialog.delete_failed'))
    } finally {
        setLoading(false)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      Customer_ID: customer.Customer_ID,
      Customer_Name: customer.Customer_Name
    }))

    // Autofill Origin if empty
    if (customer.Origin_Location && origins.length === 1 && !origins[0].name) {
       setOrigins([{ name: customer.Origin_Location, lat: '', lng: '' }])
    }
    
    // Autofill Destination if empty
    if (customer.Dest_Location && destinations.length === 1 && !destinations[0].name) {
       setDestinations([{ name: customer.Dest_Location, lat: '', lng: '' }])
    }
  }

  const handleSubmit = async (e?: React.FormEvent, stayOpen = false) => {
    if (e) e.preventDefault()
    
    // Validation
    const errors = validateForm()
    if (errors.length > 0) {
        toast.warning(errors.join('\n'))
        return
    }

    setLoading(true)

    try {
      // Job ID Handling: Manual or Auto-gen
      const effectiveJobId = formData.Job_ID.trim() || generateJobId()

      // Base data common to all jobs
      const baseData = {
        ...formData,
        Job_ID: effectiveJobId,
        Plan_Date: formData.Plan_Date, // Ensure Plan_Date is used
        Origin_Location: origins.map(o => o.name).join(' → '),
        Dest_Location: destinations.map(d => d.name).join(' → '),
        Route_Name: `${origins[0]?.name || ''} → ${destinations[destinations.length-1]?.name || ''}`,
        // Serialize complex fields
        original_origins_json: JSON.stringify(origins),
        original_destinations_json: JSON.stringify(destinations),
        extra_costs_json: JSON.stringify(extraCosts),
        Est_Distance_KM: formData.Est_Distance_KM,
        Price_Cust_Extra: formData.Price_Cust_Extra, // Ensure Extra Costs saved
        Cost_Driver_Extra: formData.Cost_Driver_Extra,
      }

      if (internalMode === 'create') {
        // Prepare array for bulk creation
        const jobsToCreate = assignments.map((assignment, index: number) => ({
            ...baseData,
            // If multiple assignments, append suffix to ensure unique Job_ID (e.g. JOB-001-1, JOB-001-2)
            Job_ID: assignments.length > 1 ? `${effectiveJobId}-${index + 1}` : effectiveJobId,
            // Per-job assignment details
            Vehicle_Type: assignment.Vehicle_Type,
            Vehicle_Plate: assignment.Vehicle_Plate || null,
            Driver_ID: assignment.Driver_ID || null,
            Sub_ID: assignment.Sub_ID || null,
            Show_Price_To_Driver: assignment.Show_Price_To_Driver,
            // Use individual costs if they differ from shared baseData
            Price_Cust_Total: assignment.Price_Cust_Total ?? baseData.Price_Cust_Total,
            Cost_Driver_Total: assignment.Cost_Driver_Total ?? baseData.Cost_Driver_Total,
            Driver_Name: assignment.Driver_ID ? (drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Driver_Name || '') : null,
        }))

        const result = await createBulkJobs(jobsToCreate)
        if (!result.success) throw new Error(result.message)

      } else {
        // For update, we only support updating specific fields of the SINGLE job being edited.
        // We take the FIRST assignment if user modified it in the list (though UI might show multiple, 
        // editing usually focuses on one ID).
        // If we strictly want to support "Split Job" during edit, that's complex logic (Delete 1 -> Create N?).
        // For now, we update the CURRENT Job_ID with the details from the first assignment (or formData which is synced).
        
        const assignment = assignments[0]
        const updateData = {
            ...baseData,
            Vehicle_Type: assignment.Vehicle_Type,
            Vehicle_Plate: assignment.Vehicle_Plate || null,
            Driver_ID: assignment.Driver_ID || null,
            Sub_ID: assignment.Sub_ID || null,
            Show_Price_To_Driver: assignment.Show_Price_To_Driver,
            Price_Cust_Total: assignment.Price_Cust_Total !== undefined ? assignment.Price_Cust_Total : baseData.Price_Cust_Total,
            Cost_Driver_Total: assignment.Cost_Driver_Total !== undefined ? assignment.Cost_Driver_Total : baseData.Cost_Driver_Total,
            Driver_Name: assignment.Driver_ID ? (drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Driver_Name || '') : null,
        }

        if (!job?.Job_ID) throw new Error(t('jobs.dialog.error'))
        const result = await updateJob(job.Job_ID, updateData)
        if (!result.success) throw new Error(result.message)
      }
      
      if (stayOpen) {
        // Reset only transient fields, keep Driver/Vehicle/Date
        setFormData(prev => ({
          ...prev,
          Job_ID: '',
          Customer_Name: '',
          Cargo_Type: '',
          Notes: '',
          Price_Cust_Total: 0,
          Cost_Driver_Total: 0,
          Weight_Kg: 0,
          Volume_Cbm: 0,
        }))
        setOrigins([{ name: '', lat: '', lng: '' }])
        setDestinations([{ name: '', lat: '', lng: '' }])
        setExtraCosts([])
        setAssignments(prev => prev.map(a => ({ ...a, Sub_ID: a.Sub_ID, Driver_ID: a.Driver_ID, Vehicle_Plate: a.Vehicle_Plate })))
        setActiveTab('info')
      } else {
        setShow(false)
      }
      
      toast.success(internalMode === 'create' ? t('jobs.dialog.save_success') : t('jobs.dialog.edit_success'))
      router.refresh()
    } catch (error: unknown) {
      // Submit error
      const message = error instanceof Error ? error.message : t('jobs.dialog.error')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleNextTab = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab)
    if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id)
    }
  }


  const tabs = [
    { id: 'info', label: t('jobs.dialog.tabs.info'), icon: <FileText className="w-4 h-4" /> },
    { id: 'location', label: t('jobs.dialog.tabs.locations'), icon: <MapPin className="w-4 h-4" /> },
    { id: 'assign', label: t('jobs.dialog.tabs.assignment'), icon: <Truck className="w-4 h-4" /> },
    ...(canViewPrice ? [{ id: 'price', label: t('jobs.dialog.tabs.price'), icon: <Banknote className="w-4 h-4" /> }] as const : []),
    ...(internalMode === 'edit' ? [{ id: 'history', label: t('jobs.dialog.tabs.history') || 'History', icon: <History className="w-4 h-4" /> }] as const : []),
  ] as const

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent 
        className="max-w-7xl max-h-[95vh] overflow-y-auto bg-background border-border text-foreground"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-6 w-full pr-8">
            <DialogTitle className="text-4xl font-black text-foreground px-1 py-1 rounded-sm uppercase tracking-tighter">
                {internalMode === 'create' ? t('jobs.dialog.title_add') : t('jobs.dialog.title_edit')}
            </DialogTitle>
            {internalMode === 'edit' && (
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleDuplicate}
                    className="border-primary/30 text-primary hover:bg-primary/10 bg-primary/5 font-black text-xl h-14"
                >
                    <Plus className="w-5 h-5 mr-3" /> {t('jobs.dialog.clone_job')}
                </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xl font-black transition-colors ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {tab.icon}
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tab: ข้อมูลงาน */}
          {activeTab === 'info' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-2">
                  <Label className="text-xl font-black text-primary/80 uppercase tracking-normal">{t('jobs.dialog.job_id')}</Label>
                  <Input
                    value={formData.Job_ID}
                    onChange={(e) => setFormData({ ...formData, Job_ID: e.target.value })}
                    placeholder={t('jobs.dialog.job_id_placeholder')}
                    className="bg-background border-input text-foreground"
                  />
                  <p className="text-base font-bold text-muted-foreground italic">{t('jobs.dialog.job_id_placeholder')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTrackingLink}
                    className="w-full mt-1 border-primary/30 text-primary hover:bg-primary/10"
                    disabled={!formData.Job_ID}
                  >
                    {copied ? <Check className="w-3 h-3 mr-2" /> : <LinkIcon className="w-3 h-3 mr-2" />}
                    {copied ? t('jobs.dialog.tracking_copied') : t('jobs.dialog.copy_tracking')}
                  </Button>
                </div>
                
                <div className="space-y-2">
                   <Label className="text-xl font-black text-primary/80 uppercase tracking-normal">{t('jobs.dialog.zone')}</Label>
                   <Select 
                      value={formData.Zone || "none"} 
                      onValueChange={(val) => setFormData({ ...formData, Zone: val === "none" ? "" : val })}
                   >
                    <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder={t('jobs.dialog.zone')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">-- Select Zone --</SelectItem>
                        {ZONES.map((z) => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                        ))}
                    </SelectContent>
                   </Select>
                </div>

                {internalMode === 'edit' && (
                  <div className="space-y-2">
                    <Label className="text-xl font-black text-primary/80 uppercase tracking-normal">{t('jobs.dialog.status')}</Label>
                    <Select 
                        value={formData.Job_Status} 
                        onValueChange={(val) => setFormData({ ...formData, Job_Status: val })}
                    >
                      <SelectTrigger className="bg-background border-input">
                          <SelectValue placeholder={t('jobs.dialog.status')} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="New">{t('jobs.status_pending')} (New)</SelectItem>
                          <SelectItem value="Requested">{t('jobs.status_requested')} (Requested)</SelectItem>
                          <SelectItem value="Assigned">{t('jobs.status_pending')} (Assigned)</SelectItem>
                          <SelectItem value="In Transit">{t('jobs.status_in_transit')} (In Transit)</SelectItem>
                          <SelectItem value="Delivered">{t('jobs.status_delivered')} (Delivered)</SelectItem>
                          <SelectItem value="Completed">{t('jobs.status_completed')} (Completed)</SelectItem>
                          <SelectItem value="Cancelled">{t('jobs.status_cancelled')} (Cancelled)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xl font-black text-primary/80 uppercase tracking-normal">
                    <Calendar className="w-4 h-4 mr-2" /> {t('jobs.dialog.plan_date')}
                  </Label>
                  <Input
                    type="date"
                    value={formData.Plan_Date}
                    onChange={(e) => setFormData({ ...formData, Plan_Date: e.target.value })}
                    required
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xl font-black text-primary/80 uppercase tracking-normal">
                    <Calendar className="w-4 h-4 mr-2" /> {t('jobs.dialog.delivery_date')}
                  </Label>
                  <Input
                    type="date"
                    value={formData.Delivery_Date}
                    onChange={(e) => setFormData({ ...formData, Delivery_Date: e.target.value })}
                    required
                    className="bg-background border-input"
                  />
                </div>
              </div>

              {isAdmin && branches.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <Label className="text-yellow-400 font-bold mb-2 block font-medium">{t('jobs.dialog.branch_super_admin')}</Label>
                    <Select 
                      value={formData.Branch_ID || "none"} 
                      onValueChange={(val) => setFormData({ ...formData, Branch_ID: val === "none" ? "" : val })}
                    >
                      <SelectTrigger className="bg-background border-yellow-500/30">
                        <SelectValue placeholder={t('jobs.dialog.use_current_branch')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('jobs.dialog.use_current_branch')}</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                            {b.Branch_Name} ({b.Branch_ID})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-base font-bold text-muted-foreground mt-1">
                      {t('jobs.dialog.branch_helper')}
                    </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                    <Building2 className="w-6 h-6 text-primary" /> {t('jobs.dialog.customer')}
                  </Label>
                   <CustomerAutocomplete
                    value={formData.Customer_Name}
                    onChange={(val) => setFormData(prev => ({ ...prev, Customer_Name: val }))}
                    customers={customers}
                    onSelect={handleCustomerSelect}
                    className="bg-background border-input text-xl h-14"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                    <Package className="w-6 h-6 text-primary" /> {t('jobs.dialog.cargo_type')}
                  </Label>
                  <Input
                    value={formData.Cargo_Type}
                    onChange={(e) => setFormData({ ...formData, Cargo_Type: e.target.value })}
                    placeholder={t('jobs.dialog.cargo_type')}
                    className="bg-background border-input text-xl h-14"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                   {t('jobs.dialog.notes')}
                </Label>
                <Textarea
                  value={formData.Notes}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                  placeholder={t('jobs.dialog.notes')}
                  className="bg-background border-input"
                  rows={2}
                />
              </div>

            </div>
          )}

          {/* Tab: สถานที่ */}
          {/* Tab: สถานที่ */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              
              {/* Derive Unique Locations for Autocomplete */}
              {(() => {
                 // Separate lists for Origin and Destination as requested
                 const originLocations = Array.from(new Set(
                    routes.map((r) => r.Origin).filter(Boolean)
                 )) as string[]

                 const destinationLocations = Array.from(new Set(
                    routes.map((r) => r.Destination).filter(Boolean)
                 )) as string[]
                 
                 return (
                   <>
                    {/* Origins */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                        <Label className="text-xl font-black text-primary uppercase tracking-normal flex items-center gap-2">
                            <MapPin className="w-5 h-5" /> {t('jobs.dialog.origin')} <span className="text-muted-foreground text-lg font-bold">({origins.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addOrigin} className="border-primary/30 text-primary hover:bg-primary/10">
                            <Plus className="w-4 h-4 mr-1" /> {t('jobs.dialog.add_origin')}
                        </Button>
                        </div>
                        {origins.map((origin, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg">
                            <div className="col-span-1 flex items-center justify-center text-muted-foreground">
                                {index + 1}
                            </div>
                            <div className="col-span-11 flex flex-col gap-4">
                                <LocationAutocomplete
                                    placeholder={t('jobs.dialog.location_placeholder')}
                                    value={origin.name}
                                    onChange={(val) => handleOriginNameChange(index, val)}
                                    locations={originLocations}
                                    className="bg-background border-input text-xl h-14"
                                />
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[140px]">
                                        <Input
                                            placeholder="Lat"
                                            value={origin.lat}
                                            onChange={(e) => updateOrigin(index, 'lat', e.target.value)}
                                            className="bg-background border-input text-xl h-14 font-black"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <Input
                                            placeholder="Lng"
                                            value={origin.lng}
                                            onChange={(e) => updateOrigin(index, 'lng', e.target.value)}
                                            className="bg-background border-input text-xl h-14 font-black"
                                        />
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <Button 
                                            type="button" 
                                            size="icon" 
                                            variant="outline" 
                                            className="h-14 w-14 border-primary/30 text-primary hover:bg-primary/10"
                                            onClick={() => handleGeocodeOrigin(index)}
                                            title={t('jobs.dialog.find_coords')}
                                        >
                                            <SearchIcon className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-12 flex justify-end">
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => removeOrigin(index)}
                                    disabled={origins.length === 1}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 text-lg font-bold"
                                >
                                    {t('jobs.dialog.delete')}
                                </Button>
                            </div>
                        </div>
                        ))}
                    </div>

                    {/* Destinations */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                        <Label className="text-xl font-black text-indigo-400 uppercase tracking-normal flex items-center gap-2">
                            <MapPin className="w-5 h-5" /> {t('jobs.dialog.destination')} <span className="text-muted-foreground text-lg font-bold">({destinations.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addDestination} className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                            <Plus className="w-4 h-4 mr-1" /> {t('jobs.dialog.add_destination')}
                        </Button>
                        </div>
                        {destinations.map((dest, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg">
                            <div className="col-span-1 flex items-center justify-center text-muted-foreground">
                                {index + 1}
                            </div>
                            <div className="col-span-11 flex flex-col gap-4">
                                <LocationAutocomplete
                                    placeholder={t('jobs.dialog.location_placeholder')}
                                    value={dest.name}
                                    onChange={(val) => handleDestinationNameChange(index, val)}
                                    locations={destinationLocations}
                                    className="bg-background border-input text-xl h-14"
                                />
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[140px]">
                                        <Input
                                            placeholder="Lat"
                                            value={dest.lat}
                                            onChange={(e) => updateDestination(index, 'lat', e.target.value)}
                                            className="bg-background border-input text-xl h-14 font-black"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <Input
                                            placeholder="Lng"
                                            value={dest.lng}
                                            onChange={(e) => updateDestination(index, 'lng', e.target.value)}
                                            className="bg-background border-input text-xl h-14 font-black"
                                        />
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <Button 
                                            type="button" 
                                            size="icon" 
                                            variant="outline" 
                                            className="h-14 w-14 border-primary/30 text-primary hover:bg-primary/10"
                                            onClick={() => handleGeocodeDestination(index)}
                                            title={t('jobs.dialog.find_coords')}
                                        >
                                            <SearchIcon className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-12 flex justify-end">
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => removeDestination(index)}
                                    disabled={destinations.length === 1}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 text-lg font-bold"
                                >
                                    {t('jobs.dialog.delete')}
                                </Button>
                            </div>
                        </div>
                        ))}
                    </div>

                    <div className="h-px bg-border my-8" />

                    {/* Weight, Volume, Distance Moved Here */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 p-6 bg-muted/20 border border-border/5 rounded-[2rem]">
                        <div className="space-y-4">
                            <Label className="text-primary text-2xl font-black uppercase tracking-normal">{t('jobs.dialog.weight') || 'Weight (KG)'}</Label>
                            <Input
                                type="number"
                                value={formData.Weight_Kg}
                                onChange={(e) => setFormData({ ...formData, Weight_Kg: Number(e.target.value) })}
                                placeholder="0.0"
                                className="bg-background border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xl h-14"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-primary text-2xl font-black uppercase tracking-normal">{t('jobs.dialog.volume') || 'Volume (CBM)'}</Label>
                            <Input
                                type="number"
                                value={formData.Volume_Cbm}
                                onChange={(e) => setFormData({ ...formData, Volume_Cbm: Number(e.target.value) })}
                                placeholder="0.0"
                                step="0.01"
                                className="bg-background border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xl h-14"
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-blue-500 text-2xl font-black uppercase tracking-normal flex items-center gap-2">
                                <MapPin className="w-5 h-5" /> {t('jobs.dialog.distance_km') || t('jobs.dialog.distance') || 'Distance (KM)'}
                            </Label>
                            <div className="relative">
                                {(() => {
                                    const isCollision = origins[0]?.lat && destinations[0]?.lat && 
                                                      origins[0].lat === destinations[0].lat && 
                                                      origins[0].lng === destinations[0].lng;
                                    
                                    return (
                                        <>
                                            <Input
                                                type="number"
                                                value={formData.Est_Distance_KM}
                                                readOnly
                                                className={cn(
                                                    "bg-blue-500/5 border-blue-500/30 text-blue-600 dark:text-blue-400 text-xl h-14 font-black cursor-not-allowed",
                                                    isCollision && "border-destructive/50 text-destructive bg-destructive/10"
                                                )}
                                            />
                                            {isCollision ? (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-sm font-black uppercase flex items-center gap-1">
                                                    <AlertTriangle className="w-4 h-4" /> {language === 'th' ? 'พิกัดซ้ำกัน' : 'Coord Collision'}
                                                </div>
                                            ) : (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500/50 text-base font-bold uppercase animate-pulse">
                                                    Auto
                                                </div>
                                            )}
                                            {isCollision && (
                                                <p className="text-xs font-bold text-destructive mt-1 italic">
                                                    {language === 'th' 
                                                        ? "* ต้นทางและปลายทางจุดเดียวกัน โปรดปรับพิกัดด้วยตนเอง" 
                                                        : "* Origin & Dest are same point. Please adjust coordinates manually."}
                                                </p>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                   </>
                 )
              })()}
            </div>
          )}

          {/* Tab: มอบหมาย */}
          {activeTab === 'assign' && (
            <div className="space-y-4">
              {/* Assignment List */}
              {assignments.map((assignment, index: number) => (
                <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border relative group">
                    {/* AI Suggestion Section */}
                    {internalMode === 'create' && index === 0 && (
                        <div className="mb-4">
                            <AiSuggestionCard 
                                jobData={{
                                    Plan_Date: formData.Plan_Date,
                                    Vehicle_Type: assignment.Vehicle_Type,
                                    // Pass coordinates from first origin if available
                                    Pickup_Lat: origins[0]?.lat ? Number(origins[0].lat) : undefined,
                                    Pickup_Lon: origins[0]?.lng ? Number(origins[0].lng) : undefined
                                }}
                                onSelect={(s) => {
                                    const newAssignments = [...assignments]
                                    newAssignments[index] = {
                                        ...newAssignments[index],
                                        Driver_ID: s.Driver_ID,
                                        Vehicle_Plate: s.Vehicle_Plate,
                                        Vehicle_Type: s.Vehicle_Type,
                                        // Auto-calculate suggested cost if AI provides it, otherwise keep current
                                        Cost_Driver_Total: assignment.Cost_Driver_Total || 0,
                                        Price_Cust_Total: assignment.Price_Cust_Total || 0
                                    }
                                    setAssignments(newAssignments)
                                    
                                    // Sync to main form data for the first assignment
                                    if (index === 0) {
                                        setFormData(prev => ({
                                            ...prev,
                                            Driver_ID: s.Driver_ID,
                                            Vehicle_Plate: s.Vehicle_Plate,
                                            Vehicle_Type: s.Vehicle_Type
                                        }))
                                    }
                                }}
                            />

                            {/* Nearby Job Bundling Suggestions */}
                            {nearbyJobs.length > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-2">
                                        <LinkIcon className="w-4 h-4" /> {t('jobs.dialog.bundling_title')}
                                    </h4>
                                    <p className="text-base font-bold text-blue-600 mb-2">{t('jobs.dialog.bundling_desc')}</p>
                                    <div className="space-y-2">
                                        {nearbyJobs.slice(0, 2).map((nj) => (
                                            <div key={nj.Job_ID} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100 shadow-sm">
                                                <div>
                                                    <p className="text-base font-bold font-bold text-foreground">{nj.Job_ID}</p>
                                                    <p className="text-base font-bold text-muted-foreground">{nj.Customer_Name}</p>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-7 text-base font-bold text-blue-600 hover:bg-blue-50 font-bold"
                                                    onClick={() => {
                                                        toast.info(t('jobs.dialog.assign_separately', { id: nj.Job_ID }))
                                                        // Future: actually add to bulk create list
                                                    }}
                                                >
                                                    {t('jobs.dialog.assign_more')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-lg font-bold uppercase font-black">
                                    <span className="bg-muted px-4 text-foreground uppercase tracking-widest">{t('jobs.dialog.manual_selection')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Header with Remove Button */}
                    <div className="flex justify-between items-center mb-6">
                        <Label className="text-primary font-black uppercase tracking-tighter text-2xl">
                            {t('jobs.dialog.vehicle_num')} {index + 1}
                        </Label>
                        {assignments.length > 1 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAssignment(index)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 px-2 text-lg font-bold"
                            >
                                <X className="w-3 h-3 mr-1" /> {t('jobs.dialog.delete')}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                                <Building2 className="w-6 h-6" /> {t('jobs.dialog.carrier_type') || 'ประเภทผู้ให้บริการ'}
                            </Label>
                            <div className="flex p-1 bg-muted rounded-xl border border-border h-14">
                                <button
                                    type="button"
                                    onClick={() => updateAssignment(index, 'Sub_ID', '')}
                                    className={cn(
                                        "flex-1 rounded-lg text-lg font-black transition-all",
                                        !assignment.Sub_ID 
                                            ? "bg-background text-primary shadow-sm" 
                                            : "text-muted-foreground hover:bg-background/50"
                                    )}
                                >
                                    {t('jobs.dialog.individual') || 'รายคัน (Internal)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (subcontractors.length > 0 && !assignment.Sub_ID) {
                                            updateAssignment(index, 'Sub_ID', subcontractors[0].Sub_ID)
                                        }
                                    }}
                                    className={cn(
                                        "flex-1 rounded-lg text-lg font-black transition-all",
                                        assignment.Sub_ID 
                                            ? "bg-background text-primary shadow-sm" 
                                            : "text-muted-foreground hover:bg-background/50"
                                    )}
                                >
                                    {t('jobs.dialog.subcontractor') || 'บริษัทรถร่วม'}
                                </button>
                            </div>
                            
                            {assignment.Sub_ID && (
                                <select
                                    value={assignment.Sub_ID}
                                    onChange={(e) => updateAssignment(index, 'Sub_ID', e.target.value)}
                                    className="w-full h-12 px-3 rounded-md bg-background border border-indigo-500/30 text-foreground text-xl font-black animate-in fade-in slide-in-from-top-2 duration-300"
                                >
                                    {subcontractors.map((sub) => (
                                        <option key={sub.Sub_ID} value={sub.Sub_ID}>{sub.Sub_Name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                                <Truck className="w-6 h-6" /> {t('jobs.dialog.vehicle_type')}
                            </Label>
                            <select
                                value={assignment.Vehicle_Type}
                                onChange={(e) => updateAssignment(index, 'Vehicle_Type', e.target.value)}
                                className="w-full h-14 px-3 rounded-md bg-background border border-input text-foreground text-2xl font-black"
                            >
                                <option value="">{t('jobs.dialog.all_types')}</option>
                                {masterVehicleTypes.map((type) => (
                                <option key={type.type_id} value={type.type_name}>{type.type_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                                <Truck className="w-6 h-6" /> {t('jobs.dialog.vehicle_plate')}
                            </Label>
                            <div className="relative group/field">
                                <VehicleAutocomplete
                                    value={assignment.Vehicle_Plate}
                                    onChange={(val) => updateAssignment(index, 'Vehicle_Plate', val)}
                                    vehicles={vehicles.filter((v) => {
                                        const subMatch = !assignment.Sub_ID ? (!v.Sub_ID) : v.Sub_ID === assignment.Sub_ID
                                        const typeMatch = !assignment.Vehicle_Type || v.Vehicle_Type === assignment.Vehicle_Type
                                        return subMatch && typeMatch
                                    })}
                                    onSelect={(v) => {
                                        const newAssignments = [...assignments]
                                        const current = newAssignments[index]
                                        newAssignments[index] = {
                                            ...current,
                                            Vehicle_Plate: v.Vehicle_Plate,
                                            Vehicle_Type: v.Vehicle_Type || current.Vehicle_Type,
                                            Sub_ID: v.Sub_ID || current.Sub_ID,
                                            Driver_ID: v.Driver_ID || current.Driver_ID
                                        }
                                        setAssignments(newAssignments)
                                        if (index === 0) {
                                            setFormData(prev => ({
                                                ...prev,
                                                Vehicle_Plate: v.Vehicle_Plate,
                                                Vehicle_Type: v.Vehicle_Type || prev.Vehicle_Type,
                                                Sub_ID: v.Sub_ID || prev.Sub_ID,
                                                Driver_ID: v.Driver_ID || prev.Driver_ID
                                            }))
                                        }
                                        if (v.Driver_ID) {
                                            toast.info(t('jobs.dialog.auto_filled_driver') || 'ดึงข้อมูลคนขับที่ผูกไว้ให้อัตโนมัติ', { icon: <User className="w-4 h-4" /> })
                                        }
                                    }}
                                    placeholder={t('jobs.dialog.vehicle_plate_placeholder')}
                                    className="bg-background border-input text-2xl h-14"
                                />
                                {assignment.Vehicle_Plate && vehicles.find(v => v.Vehicle_Plate === assignment.Vehicle_Plate)?.Driver_ID === assignment.Driver_ID && assignment.Driver_ID && (
                                    <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm animate-in zoom-in-50">
                                        <LinkIcon className="w-2.5 h-2.5" /> {t('jobs.dialog.linked') || 'LINKED'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                                <User className="w-6 h-6" /> {t('jobs.dialog.driver')}
                            </Label>
                            <div className="relative group/field">
                                <DriverAutocomplete
                                    value={assignment.Driver_ID}
                                    onChange={(val) => updateAssignment(index, 'Driver_ID', val)}
                                    drivers={drivers.filter((d) => {
                                        const subMatch = !assignment.Sub_ID ? (!d.Sub_ID) : d.Sub_ID === assignment.Sub_ID
                                        return subMatch
                                    })}
                                    onSelect={(d) => {
                                        const newAssignments = [...assignments]
                                        const current = newAssignments[index]
                                        const assignedVehicle = d.Vehicle_Plate ? vehicles.find(v => v.Vehicle_Plate === d.Vehicle_Plate) : null
                                        newAssignments[index] = {
                                            ...current,
                                            Driver_ID: d.Driver_ID,
                                            Sub_ID: d.Sub_ID || current.Sub_ID,
                                            Vehicle_Plate: assignedVehicle ? assignedVehicle.Vehicle_Plate : (d.Vehicle_Plate || current.Vehicle_Plate),
                                            Vehicle_Type: (assignedVehicle ? assignedVehicle.Vehicle_Type : (d.Vehicle_Type || current.Vehicle_Type)) || "",
                                            Show_Price_To_Driver: d.Show_Price_Default ?? current.Show_Price_To_Driver
                                        }
                                        setAssignments(newAssignments)
                                        if (index === 0) {
                                            setFormData(prev => ({
                                                ...prev,
                                                Driver_ID: d.Driver_ID,
                                                Sub_ID: d.Sub_ID || prev.Sub_ID,
                                                Vehicle_Plate: assignedVehicle ? assignedVehicle.Vehicle_Plate : (d.Vehicle_Plate || prev.Vehicle_Plate),
                                                Vehicle_Type: (assignedVehicle ? assignedVehicle.Vehicle_Type : (d.Vehicle_Type || prev.Vehicle_Type)) || "",
                                                Show_Price_To_Driver: d.Show_Price_Default ?? prev.Show_Price_To_Driver
                                            }))
                                        }
                                        if (assignedVehicle || d.Vehicle_Plate) {
                                            toast.info(t('jobs.dialog.auto_filled_vehicle') || 'ดึงข้อมูลรถที่ผูกไว้ให้อัตโนมัติ', { icon: <Truck className="w-4 h-4" /> })
                                        }
                                    }}
                                    className="bg-background border-input text-2xl h-14"
                                />
                                {assignment.Driver_ID && drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Vehicle_Plate === assignment.Vehicle_Plate && assignment.Vehicle_Plate && (
                                    <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm animate-in zoom-in-50">
                                        <LinkIcon className="w-2.5 h-2.5" /> {t('jobs.dialog.linked') || 'LINKED'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>



                    {canViewPrice && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                            {assignment.Show_Price_To_Driver ? (
                                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <EyeOff className="w-4 h-4 text-gray-700 font-bold" />
                            )}
                            <span className="text-xl font-medium">{t('jobs.dialog.show_price_to_driver')}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={assignment.Show_Price_To_Driver} 
                                onChange={(e) => updateAssignment(index, 'Show_Price_To_Driver', e.target.checked)}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                    )}

                    {/* Capacity & Zone Check UI */}
                    {(() => {
                        const selectedVehicle = vehicles.find((v) => v.Vehicle_Plate === assignment.Vehicle_Plate)
                        if (!selectedVehicle) return null

                        const maxWeight = selectedVehicle.Max_Weight_kg || 0
                        const maxVolume = selectedVehicle.Max_Volume_cbm || 0
                        
                        const jobWeight = formData.Weight_Kg || 0
                        const jobVolume = formData.Volume_Cbm || 0
                        
                        const jobZone = formData.Zone
                        const vehicleZone = selectedVehicle.Preferred_Zone

                        const weightPercent = maxWeight > 0 ? (jobWeight / maxWeight) * 100 : 0
                        const volumePercent = maxVolume > 0 ? (jobVolume / maxVolume) * 100 : 0
                        
                        const isOverweight = weightPercent > 100
                        const isOverVolume = volumePercent > 100
                        
                        // Zone Mismatch Logic
                        const isZoneMismatch = jobZone && vehicleZone && jobZone !== vehicleZone

                        if (!maxWeight && !maxVolume && !isZoneMismatch) return null

                        return (
                            <div className="mt-3 p-3 bg-card rounded-lg border border-border space-y-3">
                                {/* Zone Warning */}
                                {isZoneMismatch && (
                                    <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 mb-2">
                                        <div className="min-w-[4px] h-full bg-amber-500 rounded-full" />
                                        <div>
                                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{t('jobs.dialog.zone_mismatch')}</p>
                                            <p className="text-base font-bold text-muted-foreground">
                                                {t('jobs.dialog.job_zone')}: <span className="text-foreground">{ZONES.find(z => z.id === jobZone)?.name || jobZone}</span> <br/>
                                                {t('jobs.dialog.vehicle_zone')}: <span className="text-foreground">{ZONES.find(z => z.id === vehicleZone)?.name || vehicleZone}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(maxWeight > 0 || maxVolume > 0) && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg font-bold font-semibold text-muted-foreground uppercase tracking-wider">{t('jobs.dialog.capacity_check')}</span>
                                        {(isOverweight || isOverVolume) && (
                                            <span className="text-base font-bold bg-red-500/20 text-red-700 font-black px-1.5 py-0.5 rounded-full font-bold animate-pulse uppercase">
                                                {t('jobs.dialog.overload')}
                                            </span>
                                        )}
                                    </div>
                                )}
                                
                                {maxWeight > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-base font-bold">
                                            <span className={isOverweight ? "text-red-700 font-black" : "text-muted-foreground"}>
                                                {t('jobs.dialog.weight')}: {jobWeight.toLocaleString()} / {maxWeight.toLocaleString()} kg
                                            </span>
                                            <span className={isOverweight ? "text-red-700 font-black font-bold" : "text-muted-foreground"}>
                                                {weightPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${isOverweight ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                                style={{ width: `${Math.min(weightPercent, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {maxVolume > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-base font-bold">
                                            <span className={isOverVolume ? "text-red-700 font-black" : "text-muted-foreground"}>
                                                {t('jobs.dialog.volume')}: {jobVolume.toLocaleString()} / {maxVolume.toLocaleString()} m³
                                            </span>
                                            <span className={isOverVolume ? "text-red-700 font-black font-bold" : "text-muted-foreground"}>
                                                {volumePercent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${isOverVolume ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                style={{ width: `${Math.min(volumePercent, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                </div>
              ))}

              {/* Add Vehicle Button */}
              <Button 
                type="button" 
                variant="outline" 
                onClick={addAssignment}
                className="w-full border-dashed border-border hover:bg-muted text-muted-foreground hover:text-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" /> {t('jobs.dialog.add_vehicle')}
              </Button>

            </div>
          )}

          {/* Tab: ราคา */}
          {activeTab === 'price' && (
            <div className="space-y-6">
              {/* Smart Fuel Hint - Always show in price tab to avoid "missing" state */}
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-primary/20 rounded-2xl shadow-lg ring-1 ring-primary/30">
                          <Fuel className="text-primary w-8 h-8" strokeWidth={2.5} />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-primary font-black uppercase tracking-widest text-sm">Fuel Intel Intelligence</span>
                              {(checkingRate || isSyncingFuel) && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                          </div>
                          <p className="text-2xl font-black text-foreground tracking-tight">
                              ดีเซล B7: <span className="text-primary">
                                {fuelPrice ? `${fuelPrice.toFixed(2)}฿` : (isSyncingFuel ? 'กำลังดึงข้อมูลล่าสุด...' : 'ยังไม่มีข้อมูล')}
                              </span>
                              {suggestedRate && (
                                  <>
                                      <span className="mx-3 opacity-20">|</span>
                                      เรทแนะนำ: <span className="text-emerald-500">{suggestedRate.toLocaleString()}฿</span>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleEditRates}
                                        className="ml-2 h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full"
                                        title="แก้ไขเรท/สัญญา"
                                      >
                                        <SettingsIcon size={16} />
                                      </Button>
                                  </>
                              )}
                          </p>
                          {!fuelPrice && !isSyncingFuel && (
                              <p className="text-sm font-bold text-amber-600 mt-1 uppercase tracking-tight flex items-center gap-1">
                                  <Info size={14} /> ยังไม่มีข้อมูลราคาสำหรับวันนี้ 
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="h-auto p-0 text-amber-600 underline font-black"
                                    onClick={async () => {
                                      setIsSyncingFuel(true)
                                      const price = await getFuelPrice()
                                      setFuelPrice(price)
                                      setIsSyncingFuel(false)
                                    }}
                                  >
                                    คลิกเพื่อดึงข้อมูลใหม่
                                  </Button>
                              </p>
                          )}
                          {!suggestedRate && fuelPrice && !checkingRate && (
                              <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-tight flex items-center gap-1">
                                  <Info size={14} /> ยังไม่ได้ตั้งค่า Matrix สำหรับเส้นทางนี้
                              </p>
                          )}
                      </div>
                  </div>
                  {suggestedRate && (
                      <Button 
                          type="button"
                          onClick={() => updateAssignment(0, 'Price_Cust_Total', suggestedRate)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl h-14 px-8 shadow-xl shadow-emerald-500/20 gap-3 group"
                      >
                          <Zap size={20} className="group-hover:scale-125 transition-transform" />
                          ใช้ราคาแนะนำนี้
                      </Button>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-xl font-black text-primary/80 uppercase tracking-normal">{t('jobs.dialog.price_cust')} (THB)</Label>
                  <Input
                    type="number"
                    value={formData.Price_Cust_Total}
                    onChange={(e) => updateAssignment(0, 'Price_Cust_Total', Number(e.target.value))}
                    className="bg-background border-input text-xl h-14"
                  />
                </div>
                <div className="space-y-2">
                   <Label className="text-xl font-black text-primary/80 uppercase tracking-normal">{t('jobs.dialog.cost_driver')} (THB)</Label>
                   <Input
                    type="number"
                    value={formData.Cost_Driver_Total}
                    onChange={(e) => updateAssignment(0, 'Cost_Driver_Total', Number(e.target.value))}
                    className="bg-background border-input text-xl h-14"
                  />
                </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-2xl font-black text-primary uppercase tracking-normal">
                    <Banknote className="w-6 h-6" /> {t('jobs.dialog.extra_costs')}
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addExtraCost} className="border-primary/30 text-primary hover:bg-primary/10">
                    <Plus className="w-4 h-4 mr-1" /> {t('jobs.dialog.add_item')}
                  </Button>
                </div>
                {extraCosts.map((cost, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg items-end">
                    <div className="col-span-4 space-y-1">
                        <Label className="text-lg font-bold text-muted-foreground">{t('jobs.dialog.item')}</Label>
                        <select
                            value={cost.type}
                            onChange={(e) => updateExtraCost(index, 'type', e.target.value)}
                            className="w-full h-9 px-2 rounded-md bg-background border border-input text-foreground text-xl"
                        >
                            {EXPENSE_TYPES.map(expenseType => (
                              <option key={expenseType} value={expenseType}>
                                {t(`jobs.dialog.expenses.${expenseType}` as any) || expenseType}
                              </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-lg font-bold text-muted-foreground">{t('jobs.dialog.pay_driver')}</Label>
                        <Input
                            type="number"
                            value={cost.cost_driver}
                            onChange={(e) => updateExtraCost(index, 'cost_driver', e.target.value)}
                            className="bg-background border-input h-9"
                        />
                    </div>
                     <div className="col-span-3 space-y-1">
                        <Label className="text-lg font-bold text-muted-foreground">{t('jobs.dialog.charge_cust')}</Label>
                        <Input
                            type="number"
                            value={cost.charge_cust}
                            onChange={(e) => updateExtraCost(index, 'charge_cust', e.target.value)}
                            className="bg-background border-input h-9"
                        />
                    </div>
                    <div className="col-span-2 flex justify-end">
                         <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost"
                            onClick={() => removeExtraCost(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-muted rounded-lg flex justify-between items-center text-xl">
                    <span className="text-muted-foreground font-medium">{t('jobs.dialog.profit_summary')}</span>
                    <span className="font-bold text-emerald-700">
                        {(
                            (Number(formData.Price_Cust_Total || 0) + extraCosts.reduce((sum, c) => sum + Number(c.charge_cust || 0), 0)) - 
                            (Number(formData.Cost_Driver_Total || 0) + extraCosts.reduce((sum, c) => sum + Number(c.cost_driver || 0), 0))
                        ).toLocaleString()} {t('jobs.dialog.currency')}
                    </span>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 bg-muted/20 border border-border/5 rounded-[3rem] shadow-inner mb-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10">
                        <Activity size={120} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-widest flex items-center gap-4 italic mb-8 relative z-10">
                        <Activity className="text-primary" size={24} /> 
                        {t('jobs.dialog.timeline_title')}
                    </h3>
                    <JobTimeline jobId={formData.Job_ID} />
                </div>
                
                <div className="p-10 border-2 border-dashed border-border/10 rounded-[3rem] bg-black/10 flex items-center justify-between group/audit">
                    <div className="space-y-2">
                        <p className="text-lg font-black text-foreground uppercase tracking-widest italic group-hover/audit:text-primary transition-colors">{t('jobs.dialog.audit_verified')}</p>
                        <p className="text-xs font-black text-muted-foreground/40 uppercase tracking-[0.4em]">{t('jobs.dialog.audit_desc')}</p>
                    </div>
                    <ShieldCheck className="text-emerald-500/30 group-hover/audit:text-emerald-500 transition-all duration-700" size={48} />
                </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-6 pt-8 border-t border-border mt-8">
            {internalMode === 'edit' && canDelete && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xl h-14 font-bold"
                >
                    <Trash2 className="w-5 h-5 mr-3" /> {t('jobs.dialog.delete_job')}
                </Button>
            )}
            <div className={`flex flex-col sm:flex-row gap-4 ${internalMode === 'create' ? 'w-full justify-end' : ''}`}>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShow(false)} 
                    className="border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xl h-14 px-8 font-bold"
                >
                    {t('jobs.dialog.abort')}
                </Button>
                {internalMode === 'create' && (
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleSubmit(undefined, true)}
                    className="border-primary/30 text-primary hover:bg-primary/10 bg-primary/5 text-xl h-14 px-8 font-bold"
                  >
                    {loading && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                    {t('jobs.dialog.save_and_continue')}
                  </Button>
                )}
                <Button 
                    type="submit" 
                    disabled={loading} 
                    className="bg-primary hover:bg-primary/90 text-white text-xl h-14 px-12 font-black shadow-lg uppercase tracking-normal"
                >
                    {loading && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                    {internalMode === 'create' ? t('jobs.dialog.execute') : t('jobs.dialog.sync')}
                </Button>

                {/* Navigation Button */}
                {tabs.findIndex(t => t.id === activeTab) < tabs.length - 1 && (
                    <Button
                        type="button"
                        variant="link"
                        onClick={handleNextTab}
                        className="text-primary font-black text-xl flex items-center gap-2 hover:no-underline group"
                    >
                        <span>{t('common.next') || 'ถัดไป'}</span>
                        <Package className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

