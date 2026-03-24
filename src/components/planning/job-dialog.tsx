"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateJob, createBulkJobs, deleteJob } from "@/app/planning/actions"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"
import { LocationAutocomplete } from "@/components/location-autocomplete"
import { VehicleAutocomplete } from "@/components/vehicle-autocomplete"
import { DriverAutocomplete } from "@/components/driver-autocomplete"
import { ZONES } from "@/lib/constants"
import { useBranch } from "@/components/providers/branch-provider"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { AiSuggestionCard } from "@/components/planning/ai-suggestion-card"
import { geocodeAddress } from "@/lib/ai/geocoding"
import { Search as SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Job, JobAssignment } from "@/lib/supabase/jobs"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"
import { 
  Loader2, 
  Plus, 
  X, 
  MapPin, 
  Truck,
  User, 
  Package,
  Building2,
  Calendar,
  Banknote,
  FileText,
  Trash2,

  Link as LinkIcon,
  Check,
  Eye,
  EyeOff
} from "lucide-react"

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
  "ค่าแรงยกของ",
  "ค่าพาเลท",
  "ค่าทางด่วน",
  "ค่าล่วงเวลา",
  "ค่าจอดรถ",
  "ค่าน้ำมันเพิ่ม",
  "อื่นๆ"
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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'assign' | 'price'>('info')
  const [internalMode, setInternalMode] = useState<'create' | 'edit'>(mode)
  
  const isControlled = controlledOpen !== undefined
  const show = isControlled ? controlledOpen : open
  const setShow = isControlled ? setControlledOpen! : setOpen
  const [copied, setCopied] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    Job_ID: job?.Job_ID || '', // Empty for new jobs to allow manual entry or auto-gen
    Plan_Date: job?.Pickup_Date || job?.Plan_Date || defaultDate || new Date().toISOString().split('T')[0],
    Delivery_Date: job?.Delivery_Date || defaultDate || new Date().toISOString().split('T')[0],
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
    branch_id: job?.branch_id || '',
    Delivery_Lat: job?.Delivery_Lat || null,
    Delivery_Lon: job?.Delivery_Lon || null,
    Sub_ID: job?.Sub_ID || '',
    Show_Price_To_Driver: job?.Show_Price_To_Driver !== false,
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

  // Helper to safely parse JSON or return existing array
  const parseJson = (val: string | unknown[] | null | undefined, defaultVal: unknown) => {
    if (!val) return defaultVal
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return defaultVal
      }
    }
    return defaultVal
  }

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

  // Extra costs
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>(
    parseJson((job?.extra_costs || job?.extra_costs_json) as string | unknown[], []) as ExtraCost[]
  )

  // Job Bundling State
  const [nearbyJobs, setNearbyJobs] = useState<Array<{ Job_ID: string; Customer_Name: string | null }>>([])

  useEffect(() => {
    if (show && internalMode === 'create' && !job) {
      setFormData(prev => ({ 
        ...prev, 
        Job_ID: '',
        Plan_Date: defaultDate || new Date().toISOString().split('T')[0],
        Delivery_Date: defaultDate || new Date().toISOString().split('T')[0]
      }))
    }
  }, [show, internalMode, job, defaultDate])

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

  // Sync initial assignment state from job prop if editing
  useEffect(() => {
    if (show && internalMode === 'edit' && job) {
        setAssignments([{
            Vehicle_Type: job.Vehicle_Type || '4-Wheel',
            Vehicle_Plate: job.Vehicle_Plate || '',
            Driver_ID: job.Driver_ID || '',
            branch_id: job.branch_id || '',
            Sub_ID: job.Sub_ID || '',
            Show_Price_To_Driver: job.Show_Price_To_Driver !== false,
            Cost_Driver_Total: job.Cost_Driver_Total ? Number(job.Cost_Driver_Total) : 0,
            Price_Cust_Total: job.Price_Cust_Total ? Number(job.Price_Cust_Total) : 0
        }])
    } else if (show && internalMode === 'create' && !job?.assignments) {
        // Reset to one empty assignment if not cloned
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
  }, [show, internalMode, job])

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
      const res = await geocodeAddress(origin.name)
      if (res) {
        updateOrigin(index, 'lat', res.lat.toString())
        updateOrigin(index, 'lng', res.lng.toString())
      } else {
        toast.info("ไม่พบพิกัดสำหรับสถานที่นี้")
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
      const res = await geocodeAddress(dest.name)
      if (res) {
        updateDestination(index, 'lat', res.lat.toString())
        updateDestination(index, 'lng', res.lng.toString())
      } else {
        toast.info("ไม่พบพิกัดสำหรับสถานที่นี้")
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

  const addDestination = () => setDestinations([...destinations, { name: '', lat: '', lng: '' }])
  const removeDestination = (index: number) => {
    if (destinations.length > 1) setDestinations(destinations.filter((_, i) => i !== index))
  }
  const updateDestination = (index: number, field: keyof LocationPoint, value: string) => {
    const updated = [...destinations]
    updated[index][field] = value
    setDestinations(updated)
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
    setAssignments(newAssignments)
    
    // Sync first assignment to main form data for backward compatibility / validation
    if (index === 0 && (typeof value === 'string' || typeof value === 'number')) {
        setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const addExtraCost = () => setExtraCosts([...extraCosts, { type: EXPENSE_TYPES[0], cost_driver: 0, charge_cust: 0 }])
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

    if (!formData.Customer_Name) errors.push("กรุณาระบุชื่อลูกค้า")
    if (!origins[0].name) errors.push("กรุณาระบุต้นทางอย่างน้อย 1 แห่ง")
    if (!destinations[0].name) errors.push("กรุณาระบุปลายทางอย่างน้อย 1 แห่ง")
    
    // Check assignments - Relaxed for bidding system (Optional driver/vehicle)
    return errors
  }

  const handleDelete = async () => {
    if (!job?.Job_ID) return
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) return
    
    setLoading(true)
    try {
        const result = await deleteJob(job.Job_ID)
        if (!result.success) throw new Error(result.message)
        setShow(false)
        toast.success("ลบงานเรียบร้อยแล้ว")
        router.refresh()
    } catch {
        // Delete error
        toast.error('ลบงานไม่สำเร็จ')
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
      }

      if (internalMode === 'create') {
        // Prepare array for bulk creation
        const jobsToCreate = assignments.map((assignment, index: number) => ({
            ...baseData,
            // If multiple assignments, append suffix to ensure unique Job_ID (e.g. JOB-001-1, JOB-001-2)
            Job_ID: assignments.length > 1 ? `${effectiveJobId}-${index + 1}` : effectiveJobId,
            // Per-job assignment details
            Vehicle_Type: assignment.Vehicle_Type,
            Vehicle_Plate: assignment.Vehicle_Plate,
            Driver_ID: assignment.Driver_ID,
            Sub_ID: assignment.Sub_ID,
            Show_Price_To_Driver: assignment.Show_Price_To_Driver,
            // Use individual costs if they differ from shared baseData
            Price_Cust_Total: assignment.Price_Cust_Total ?? baseData.Price_Cust_Total,
            Cost_Driver_Total: assignment.Cost_Driver_Total ?? baseData.Cost_Driver_Total,
            Driver_Name: drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Driver_Name || '',
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
            Vehicle_Plate: assignment.Vehicle_Plate,
            Driver_ID: assignment.Driver_ID,
            Sub_ID: assignment.Sub_ID,
            Show_Price_To_Driver: assignment.Show_Price_To_Driver,
            Price_Cust_Total: assignment.Price_Cust_Total !== undefined ? assignment.Price_Cust_Total : baseData.Price_Cust_Total,
            Cost_Driver_Total: assignment.Cost_Driver_Total !== undefined ? assignment.Cost_Driver_Total : baseData.Cost_Driver_Total,
            Driver_Name: drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Driver_Name || '',
        }

        if (!job?.Job_ID) throw new Error('ไม่พบรหัสงานสำหรับการแก้ไข')
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
      
      toast.success(internalMode === 'create' ? "บันทึกงานเรียบร้อย" : "แก้ไขข้อมูลเรียบร้อย")
      router.refresh()
    } catch {
      // Submit error
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }


  const tabs = [
    { id: 'info', label: 'ข้อมูลงาน', icon: <FileText className="w-4 h-4" /> },
    { id: 'location', label: 'สถานที่', icon: <MapPin className="w-4 h-4" /> },
    { id: 'assign', label: 'มอบหมาย', icon: <Truck className="w-4 h-4" /> },
    ...(canViewPrice ? [{ id: 'price', label: 'ราคา', icon: <Banknote className="w-4 h-4" /> }] as const : []),
  ] as const

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border text-foreground"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-black text-slate-950">
                {internalMode === 'create' ? 'สร้างงานใหม่' : 'แก้ไขงาน'}
            </DialogTitle>
            {internalMode === 'edit' && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicate}
                    className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/10 font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" /> คัดลอกงาน (เพิ่มรถ)
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
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tab: ข้อมูลงาน */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Job ID</Label>
                  <Input
                    value={formData.Job_ID}
                    onChange={(e) => setFormData({ ...formData, Job_ID: e.target.value })}
                    placeholder="ปล่อยว่างเพื่อ gen อัตโนมัติ"
                    className="bg-background border-input"
                  />
                  <p className="text-base font-bold text-muted-foreground italic">เว้นว่างไว้หากต้องการให้ระบบรันเลขให้</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTrackingLink}
                    className="w-full mt-1 border-primary/30 text-primary hover:bg-primary/10"
                    disabled={!formData.Job_ID}
                  >
                    {copied ? <Check className="w-3 h-3 mr-2" /> : <LinkIcon className="w-3 h-3 mr-2" />}
                    {copied ? 'คัดลอกแล้ว' : 'Copy Tracking Link'}
                  </Button>
                </div>
                
                <div className="space-y-2">
                   <Label>โซนพื้นที่ (Zone)</Label>
                   <Select 
                      value={formData.Zone} 
                      onValueChange={(val) => setFormData({ ...formData, Zone: val })}
                   >
                    <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="เลือกโซน (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        {ZONES.map((z) => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                        ))}
                    </SelectContent>
                   </Select>
                </div>

                <div className="space-y-2">
                   <Label>สถานะงาน</Label>
                   <Select 
                      value={formData.Job_Status} 
                      onValueChange={(val) => setFormData({ ...formData, Job_Status: val })}
                   >
                    <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="New">งานใหม่ (New)</SelectItem>
                        <SelectItem value="Assigned">มอบหมายแล้ว (Assigned)</SelectItem>
                        <SelectItem value="In Transit">กำลังขนส่ง (In Transit)</SelectItem>
                        <SelectItem value="Delivered">ส่งสินค้าแล้ว (Delivered)</SelectItem>
                        <SelectItem value="Completed">เสร็จสิ้น/ปิดงาน (Completed)</SelectItem>
                        <SelectItem value="Cancelled">ยกเลิก (Cancelled)</SelectItem>
                    </SelectContent>
                   </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> วันที่รับ
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
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> วันที่ส่ง
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
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <Label className="text-yellow-500 font-bold mb-2 block font-medium">สาขาสำหรับงานนี้ (Super Admin Only)</Label>
                    <Select 
                      value={formData.branch_id || "none"} 
                      onValueChange={(val) => setFormData({ ...formData, branch_id: val === "none" ? "" : val })}
                    >
                      <SelectTrigger className="bg-background border-yellow-500/30">
                        <SelectValue placeholder="-- ใช้สาขาปัจจุบัน --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- ใช้สาขาปัจจุบัน --</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                            {b.Branch_Name} ({b.Branch_ID})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-base font-bold text-muted-foreground mt-1">
                      หากไม่เลือก จะใช้สาขาที่ท่านกำลังเลือกอยู่ที่แถบด้านบน (Header)
                    </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> ลูกค้า
                  </Label>
                   <CustomerAutocomplete
                    value={formData.Customer_Name}
                    onChange={(val) => setFormData(prev => ({ ...prev, Customer_Name: val }))}
                    customers={customers}
                    onSelect={handleCustomerSelect}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Package className="w-3 h-3" /> สินค้า
                  </Label>
                  <Input
                    value={formData.Cargo_Type}
                    onChange={(e) => setFormData({ ...formData, Cargo_Type: e.target.value })}
                    placeholder="ประเภทสินค้า"
                    className="bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                   หมายเหตุ (Customer Notes)
                </Label>
                <Textarea
                  value={formData.Notes}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติมจากลูกค้า"
                  className="bg-background border-input"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-emerald-600 dark:text-emerald-400">น้ำหนัก (kg)</Label>
                    <Input
                        type="number"
                        value={formData.Weight_Kg}
                        onChange={(e) => setFormData({ ...formData, Weight_Kg: Number(e.target.value) })}
                        placeholder="0.0"
                        className="bg-background border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-emerald-600 dark:text-emerald-400">ปริมาตร (CBM)</Label>
                    <Input
                        type="number"
                        value={formData.Volume_Cbm}
                        onChange={(e) => setFormData({ ...formData, Volume_Cbm: Number(e.target.value) })}
                        placeholder="0.0"
                        step="0.01"
                        className="bg-background border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    />
                 </div>
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
                        <Label className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> จุดต้นทาง <span className="text-muted-foreground text-lg font-bold">({originLocations.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addOrigin} className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300">
                            <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                        </Button>
                        </div>
                        {origins.map((origin, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg">
                            <div className="col-span-1 flex items-center justify-center text-muted-foreground">
                                {index + 1}
                            </div>
                            <div className="col-span-11 grid grid-cols-1 gap-2">
                                <LocationAutocomplete
                                    placeholder="ชื่อโรงงาน/สถานที่"
                                    value={origin.name}
                                    onChange={(val) => updateOrigin(index, 'name', val)}
                                    locations={originLocations}
                                    className="bg-background border-input"
                                />
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-5">
                                        <Input
                                            placeholder="Lat"
                                            value={origin.lat}
                                            onChange={(e) => updateOrigin(index, 'lat', e.target.value)}
                                            className="bg-background border-input text-lg font-bold"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <Input
                                            placeholder="Lng"
                                            value={origin.lng}
                                            onChange={(e) => updateOrigin(index, 'lng', e.target.value)}
                                            className="bg-background border-input text-lg font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Button 
                                            type="button" 
                                            size="icon" 
                                            variant="outline" 
                                            className="h-8 w-full bg-emerald-50 text-emerald-600 border-emerald-200"
                                            onClick={() => handleGeocodeOrigin(index)}
                                            title="ค้นหาพิกัด"
                                        >
                                            <SearchIcon className="w-3 h-3" />
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
                                    ลบ
                                </Button>
                            </div>
                        </div>
                        ))}
                    </div>

                    {/* Destinations */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                        <Label className="text-indigo-600 dark:text-emerald-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> จุดปลายทาง <span className="text-muted-foreground text-lg font-bold">({destinationLocations.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addDestination} className="border-indigo-500/50 text-indigo-600 dark:text-emerald-600 hover:bg-emerald-500/10 hover:text-indigo-700 dark:hover:text-emerald-500">
                            <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                        </Button>
                        </div>
                        {destinations.map((dest, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg">
                            <div className="col-span-1 flex items-center justify-center text-muted-foreground">
                                {index + 1}
                            </div>
                            <div className="col-span-11 grid grid-cols-1 gap-2">
                                <LocationAutocomplete
                                    placeholder="ชื่อลูกค้า/สถานที่ส่ง"
                                    value={dest.name}
                                    onChange={(val) => updateDestination(index, 'name', val)}
                                    locations={destinationLocations}
                                    className="bg-background border-input"
                                />
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-5">
                                        <Input
                                            placeholder="Lat"
                                            value={dest.lat}
                                            onChange={(e) => updateDestination(index, 'lat', e.target.value)}
                                            className="bg-background border-input text-lg font-bold"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <Input
                                            placeholder="Lng"
                                            value={dest.lng}
                                            onChange={(e) => updateDestination(index, 'lng', e.target.value)}
                                            className="bg-background border-input text-lg font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Button 
                                            type="button" 
                                            size="icon" 
                                            variant="outline" 
                                            className="h-8 w-full bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"
                                            onClick={() => handleGeocodeDestination(index)}
                                            title="ค้นหาพิกัด"
                                        >
                                            <SearchIcon className="w-3 h-3" />
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
                                    ลบ
                                </Button>
                            </div>
                        </div>
                        ))}
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
                                    <h4 className="text-lg font-bold font-bold text-blue-700 flex items-center gap-2 mb-2">
                                        <LinkIcon className="w-3 h-3" /> แนะนำ: ยุบรวมงาน (Job Bundling)
                                    </h4>
                                    <p className="text-base font-bold text-blue-600 mb-2">พบงานที่อยู่ใกล้เคียงกัน สามารถส่งพร้อมกันได้:</p>
                                    <div className="space-y-2">
                                        {nearbyJobs.slice(0, 2).map((nj) => (
                                            <div key={nj.Job_ID} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100 shadow-sm">
                                                <div>
                                                    <p className="text-base font-bold font-bold text-slate-900">{nj.Job_ID}</p>
                                                    <p className="text-base font-bold text-slate-500">{nj.Customer_Name}</p>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-7 text-base font-bold text-blue-600 hover:bg-blue-50 font-bold"
                                                    onClick={() => {
                                                        toast.info(`กรุณามอบหมายงาน ${nj.Job_ID} ให้คนขับคนเดียวกันแยกต่างหาก`)
                                                        // Future: actually add to bulk create list
                                                    }}
                                                >
                                                    มอบหมายเพิ่ม
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
                                <div className="relative flex justify-center text-lg font-bold uppercase">
                                    <span className="bg-muted px-2 text-muted-foreground">หรือเลือกแบบกำหนดเอง (Manual Selection)</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Header with Remove Button */}
                    <div className="flex justify-between items-center mb-3">
                        <Label className="text-emerald-600 font-medium">
                            รถคันที่ {index + 1}
                        </Label>
                        {assignments.length > 1 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAssignment(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2 text-lg font-bold"
                            >
                                <X className="w-3 h-3 mr-1" /> ลบ
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-lg font-bold text-muted-foreground">
                            <Truck className="w-3 h-3" /> ประเภทรถ
                        </Label>
                        <select
                            value={assignment.Vehicle_Type}
                            onChange={(e) => updateAssignment(index, 'Vehicle_Type', e.target.value)}
                            className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-xl"
                        >
                            <option value="">ทั้งหมด (ไม่ระบุ)</option>
                            {/* Unique Vehicle Types from Data */}
                            {Array.from(new Set(vehicles.map((v) => v.vehicle_type).filter((t): t is string => !!t))).map((type) => (
                            <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        </div>
                        <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-lg font-bold text-muted-foreground">
                            <Truck className="w-3 h-3" /> ทะเบียนรถ
                        </Label>
                        <VehicleAutocomplete
                            value={assignment.Vehicle_Plate}
                            onChange={(val) => updateAssignment(index, 'Vehicle_Plate', val)}
                            vehicles={assignment.Vehicle_Type 
                                ? vehicles.filter((v) => v.vehicle_type === assignment.Vehicle_Type) 
                                : vehicles
                            }
                            onSelect={(v) => {
                                // Auto-fill driver and other vehicle details
                                const newAssignments = [...assignments]
                                const current = newAssignments[index]
                                
                                // Find assigned driver if any
                                const assignedDriver = v.driver_id ? drivers.find(d => d.Driver_ID === v.driver_id) : null
                                
                                newAssignments[index] = {
                                    ...current,
                                    Vehicle_Plate: v.vehicle_plate,
                                    Vehicle_Type: v.vehicle_type || current.Vehicle_Type,
                                    Sub_ID: v.sub_id || current.Sub_ID,
                                    Driver_ID: assignedDriver ? assignedDriver.Driver_ID : current.Driver_ID
                                }
                                setAssignments(newAssignments)

                                // Sync to main form data for the first assignment
                                if (index === 0) {
                                    setFormData(prev => ({
                                        ...prev,
                                        Vehicle_Plate: v.vehicle_plate,
                                        Vehicle_Type: v.vehicle_type || prev.Vehicle_Type,
                                        Sub_ID: v.sub_id || prev.Sub_ID,
                                        Driver_ID: assignedDriver ? assignedDriver.Driver_ID : prev.Driver_ID
                                    }))
                                }
                            }}
                            placeholder="พิมพ์ทะเบียนรถ..."
                            className="bg-background border-input text-xl"
                        />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1 text-lg font-bold text-muted-foreground">
                                <Building2 className="w-3 h-3" /> บริษัทรถร่วม (Carrier)
                            </Label>
                            <select
                                value={assignment.Sub_ID || ""}
                                onChange={(e) => updateAssignment(index, 'Sub_ID', e.target.value)}
                                className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-xl"
                            >
                                <option value="">ไม่ได้ระบุ (Internal)</option>
                                {subcontractors.map((sub) => (
                                    <option key={sub.Sub_ID} value={sub.Sub_ID}>{sub.Sub_Name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1 text-lg font-bold text-gray-500">
                                <User className="w-3 h-3" /> คนขับ
                            </Label>
                            <DriverAutocomplete
                                value={assignment.Driver_ID}
                                onChange={(val) => updateAssignment(index, 'Driver_ID', val)}
                                drivers={drivers}
                                onSelect={(d) => {
                                    // Auto-fill vehicle and other driver details
                                    const newAssignments = [...assignments]
                                    const current = newAssignments[index]
                                    
                                    // Find assigned vehicle if any
                                    const assignedVehicle = d.Vehicle_Plate ? vehicles.find(v => v.vehicle_plate === d.Vehicle_Plate) : null
                                    
                                    newAssignments[index] = {
                                        ...current,
                                        Driver_ID: d.Driver_ID,
                                        Sub_ID: d.Sub_ID || current.Sub_ID,
                                        Vehicle_Plate: assignedVehicle ? assignedVehicle.vehicle_plate : (d.Vehicle_Plate || current.Vehicle_Plate),
                                        Vehicle_Type: assignedVehicle ? assignedVehicle.vehicle_type : (d.Vehicle_Type || current.Vehicle_Type),
                                        // Use driver default if explicitly set, otherwise keep current
                                        Show_Price_To_Driver: d.Show_Price_Default ?? current.Show_Price_To_Driver
                                    }
                                    setAssignments(newAssignments)
                                    
                                    // Sync to main form data for the first assignment
                                    if (index === 0) {
                                        setFormData(prev => ({
                                            ...prev,
                                            Driver_ID: d.Driver_ID,
                                            Sub_ID: d.Sub_ID || prev.Sub_ID,
                                            Vehicle_Plate: assignedVehicle ? assignedVehicle.vehicle_plate : (d.Vehicle_Plate || prev.Vehicle_Plate),
                                            Vehicle_Type: assignedVehicle ? assignedVehicle.vehicle_type : (d.Vehicle_Type || prev.Vehicle_Type),
                                            Show_Price_To_Driver: d.Show_Price_Default ?? prev.Show_Price_To_Driver
                                        }))
                                    }
                                }}
                                className="bg-background border-input text-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-base font-bold text-muted-foreground flex items-center gap-1">
                                <Banknote className="w-3 h-3" /> ค่าจ้างรถ (บาท)
                            </Label>
                            <Input
                                type="number"
                                value={assignment.Cost_Driver_Total}
                                onChange={(e) => updateAssignment(index, 'Cost_Driver_Total', Number(e.target.value))}
                                className="h-8 text-lg font-bold bg-background border-input"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-base font-bold text-muted-foreground flex items-center gap-1">
                                <Banknote className="w-3 h-3" /> ราคาลูกค้า (บาท)
                            </Label>
                            <Input
                                type="number"
                                value={assignment.Price_Cust_Total}
                                onChange={(e) => updateAssignment(index, 'Price_Cust_Total', Number(e.target.value))}
                                className="h-8 text-lg font-bold bg-background border-input"
                            />
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
                            <span className="text-xl font-medium">โชว์ค่าเที่ยวให้คนขับเห็น</span>
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
                        const selectedVehicle = vehicles.find((v) => v.vehicle_plate === assignment.Vehicle_Plate)
                        if (!selectedVehicle) return null

                        const maxWeight = selectedVehicle.max_weight_kg || 0
                        const maxVolume = selectedVehicle.max_volume_cbm || 0
                        
                        const jobWeight = formData.Weight_Kg || 0
                        const jobVolume = formData.Volume_Cbm || 0
                        
                        const jobZone = formData.Zone
                        const vehicleZone = selectedVehicle.preferred_zone

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
                                            <p className="text-lg font-bold font-bold text-amber-600 dark:text-amber-400">Zone Mismatch</p>
                                            <p className="text-base font-bold text-muted-foreground">
                                                งานโซน: <span className="text-foreground">{ZONES.find(z => z.id === jobZone)?.name || jobZone}</span> <br/>
                                                รถประจำโซน: <span className="text-foreground">{ZONES.find(z => z.id === vehicleZone)?.name || vehicleZone}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(maxWeight > 0 || maxVolume > 0) && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg font-bold font-semibold text-muted-foreground">ตรวจสอบการบรรทุก (Capacity)</span>
                                        {(isOverweight || isOverVolume) && (
                                            <span className="text-base font-bold bg-red-500/20 text-red-700 font-black px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                                OVERLOAD
                                            </span>
                                        )}
                                    </div>
                                )}
                                
                                {maxWeight > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-base font-bold">
                                            <span className={isOverweight ? "text-red-700 font-black" : "text-muted-foreground"}>
                                                น้ำหนัก: {jobWeight.toLocaleString()} / {maxWeight.toLocaleString()} kg
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
                                                ปริมาตร: {jobVolume.toLocaleString()} / {maxVolume.toLocaleString()} m³
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
                <Plus className="w-4 h-4 mr-2" /> เพิ่มรถอีกคัน
              </Button>

            </div>
          )}

          {/* Tab: ราคา */}
          {activeTab === 'price' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ราคาลูกค้า (บาท)</Label>
                  <Input
                    type="number"
                    value={formData.Price_Cust_Total}
                    onChange={(e) => updateAssignment(0, 'Price_Cust_Total', Number(e.target.value))}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                   <Label>ค่าจ้างรถ (บาท)</Label>
                   <Input
                    type="number"
                    value={formData.Cost_Driver_Total}
                    onChange={(e) => updateAssignment(0, 'Cost_Driver_Total', Number(e.target.value))}
                    className="bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" /> ค่าใช้จ่ายเพิ่มเติม
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addExtraCost} className="border-border hover:bg-muted">
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                  </Button>
                </div>
                {extraCosts.map((cost, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/30 rounded-lg items-end">
                    <div className="col-span-4 space-y-1">
                        <Label className="text-lg font-bold text-muted-foreground">รายการ</Label>
                        <select
                            value={cost.type}
                            onChange={(e) => updateExtraCost(index, 'type', e.target.value)}
                            className="w-full h-9 px-2 rounded-md bg-background border border-input text-foreground text-xl"
                        >
                            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-lg font-bold text-muted-foreground">จ่ายรถ</Label>
                        <Input
                            type="number"
                            value={cost.cost_driver}
                            onChange={(e) => updateExtraCost(index, 'cost_driver', e.target.value)}
                            className="bg-background border-input h-9"
                        />
                    </div>
                     <div className="col-span-3 space-y-1">
                        <Label className="text-lg font-bold text-muted-foreground">เก็บลูกค้า</Label>
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
                    <span className="text-muted-foreground font-medium">รวมกำไรเบื้องต้น</span>
                    <span className="font-bold text-emerald-700">
                        {(
                            (Number(formData.Price_Cust_Total || 0) + extraCosts.reduce((sum, c) => sum + Number(c.charge_cust || 0), 0)) - 
                            (Number(formData.Cost_Driver_Total || 0) + extraCosts.reduce((sum, c) => sum + Number(c.cost_driver || 0), 0))
                        ).toLocaleString()} บาท
                    </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-border">
            {internalMode === 'edit' && canDelete && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> ลบงาน
                </Button>
            )}
            <div className={`flex flex-wrap gap-3 ${internalMode === 'create' ? 'w-full justify-end' : ''}`}>
                <Button type="button" variant="outline" onClick={() => setShow(false)} className="border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                ยกเลิก
                </Button>
                {internalMode === 'create' && (
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleSubmit(undefined, true)}
                    className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/10 font-bold"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    บันทึกและสร้างต่อ
                  </Button>
                )}
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {internalMode === 'create' ? 'สร้างงาน' : 'บันทึกการแก้ไข'}
                </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

