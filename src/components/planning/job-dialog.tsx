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

export type JobAssignment = {
  Vehicle_Type: string
  Vehicle_Plate: string
  Driver_ID: string
  Sub_ID?: string
  Show_Price_To_Driver?: boolean
}

export type Job = {
  Job_ID: string
  Plan_Date?: string | null
  Pickup_Date?: string | null
  Delivery_Date?: string | null
  Customer_Name?: string | null
  Route_Name?: string | null
  Driver_ID?: string | null
  Vehicle_Plate?: string | null
  Vehicle_Type?: string | null
  Cargo_Type?: string | null
  Notes?: string | null
  Price_Cust_Total?: number | string | null
  Cost_Driver_Total?: number | string | null
  Job_Status?: string | null
  Weight_Kg?: number | null
  Volume_Cbm?: number | null
  Zone?: string | null
  Branch_ID?: string | null
  origins?: LocationPoint[] | string | null
  destinations?: LocationPoint[] | string | null
  extra_costs?: ExtraCost[] | string | null
  original_origins_json?: string | null
  original_destinations_json?: string | null
  extra_costs_json?: string | null
  assignments?: JobAssignment[] | null
  Sub_ID?: string | null
  Show_Price_To_Driver?: boolean | null
}
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
  job?: Job
  drivers?: Driver[]
  vehicles?: Vehicle[]
  customers?: Customer[]
  routes?: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  canViewPrice?: boolean
  canDelete?: boolean
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
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  canViewPrice = true,
  canDelete = true
}: JobDialogProps) {
  const { branches, isAdmin } = useBranch()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'assign' | 'price'>('info')
  
  const isControlled = controlledOpen !== undefined
  const show = isControlled ? controlledOpen : open
  const setShow = isControlled ? setControlledOpen! : setOpen
  const [copied, setCopied] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    Job_ID: job?.Job_ID || generateJobId(),
    Plan_Date: job?.Pickup_Date || job?.Plan_Date || new Date().toISOString().split('T')[0],
    Delivery_Date: job?.Delivery_Date || new Date().toISOString().split('T')[0],
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
    Branch_ID: job?.Branch_ID || ''
  })

  // Multi-Assignment State
  const [assignments, setAssignments] = useState(
    job?.assignments && job.assignments.length > 0
      ? job.assignments
      : [{ Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '', Sub_ID: '', Show_Price_To_Driver: true }]
  )

  // Helper to safely parse JSON or return existing array
  const parseJson = (val: any, defaultVal: any) => {
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
  const [origins, setOrigins] = useState<LocationPoint[]>(
    parseJson(job?.origins || job?.original_origins_json, [{ name: '', lat: '', lng: '' }])
  )

  // Multi-point destinations
  const [destinations, setDestinations] = useState<LocationPoint[]>(
    parseJson(job?.destinations || job?.original_destinations_json, [{ name: '', lat: '', lng: '' }])
  )

  // Extra costs
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>(
    parseJson(job?.extra_costs || job?.extra_costs_json, [])
  )

  // Generate new ID on dialog open (create mode)
  useEffect(() => {
    if (show && mode === 'create') {
      setFormData(prev => ({ ...prev, Job_ID: generateJobId() }))
    }
  }, [show, mode])

  // Sync initial assignment state from job prop if editing
  useEffect(() => {
    if (show && mode === 'edit' && job) {
        setAssignments([{
            Vehicle_Type: job.Vehicle_Type || '4-Wheel',
            Vehicle_Plate: job.Vehicle_Plate || '',
            Driver_ID: job.Driver_ID || '',
            Sub_ID: job.Sub_ID || '',
            Show_Price_To_Driver: job.Show_Price_To_Driver !== false
        }])
    } else if (show && mode === 'create') {
        // Reset to one empty assignment
        setAssignments([{ Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '', Sub_ID: '', Show_Price_To_Driver: true }])
    }
  }, [show, mode, job])

  const handleCopyTrackingLink = () => {
    const origin = window.location.origin
    const url = `${origin}/track/${formData.Job_ID}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    setAssignments([...assignments, { Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '', Sub_ID: '', Show_Price_To_Driver: true }])
  }

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
        setAssignments(assignments.filter((_, i) => i !== index))
    }
  }

  const updateAssignment = (index: number, field: string, value: string | boolean) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], [field]: value } as JobAssignment
    setAssignments(newAssignments)
    
    // Sync first assignment to main form data for backward compatibility / validation
    if (index === 0 && typeof value === 'string') {
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
    
    // Check assignments
    if (mode === 'create') {
        assignments.forEach((a, i) => {
            if (!a.Vehicle_Plate && !a.Driver_ID) {
                errors.push(`กรุณาระบุข้อมูลรถหรือคนขับ สำหรับรถคันที่ ${i + 1}`)
            }
        })
    }
    
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
        router.refresh()
    } catch (e) {
        const error = e as Error
        console.error(error)
        alert(error.message || 'ลบงานไม่สำเร็จ')
    } finally {
        setLoading(false)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const errors = validateForm()
    if (errors.length > 0) {
        alert(errors.join('\n'))
        return
    }

    setLoading(true)

    try {
      // Base data common to all jobs
      const baseData = {
        ...formData,
        Plan_Date: formData.Plan_Date, // Ensure Plan_Date is used
        Origin_Location: origins.map(o => o.name).join(' → '),
        Dest_Location: destinations.map(d => d.name).join(' → '),
        Route_Name: `${origins[0]?.name || ''} → ${destinations[destinations.length-1]?.name || ''}`,
        // Serialize complex fields
        original_origins_json: JSON.stringify(origins),
        original_destinations_json: JSON.stringify(destinations),
        extra_costs_json: JSON.stringify(extraCosts),
      }

      if (mode === 'create') {
        // Prepare array for bulk creation
        const jobsToCreate = assignments.map((assignment, index: number) => ({
            ...baseData,
            // If multiple assignments, append suffix to ensure unique Job_ID (e.g. JOB-001-1, JOB-001-2)
            Job_ID: assignments.length > 1 ? `${baseData.Job_ID}-${index + 1}` : baseData.Job_ID,
            // Per-job assignment details
            Vehicle_Type: assignment.Vehicle_Type,
            Vehicle_Plate: assignment.Vehicle_Plate,
            Driver_ID: assignment.Driver_ID,
            Sub_ID: assignment.Sub_ID,
            Show_Price_To_Driver: assignment.Show_Price_To_Driver,
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
            Driver_Name: drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Driver_Name || '',
        }

        const result = await updateJob(job.Job_ID, updateData)
        if (!result.success) throw new Error(result.message)
      }
      
      setShow(false)
      router.refresh()
    } catch (e) {
      const error = e as Error
      console.error(error)
      alert(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'create' ? 'สร้างงานใหม่' : 'แก้ไขงาน'}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                    disabled
                    className="bg-muted/50 border-input text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">สร้างอัตโนมัติ</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTrackingLink}
                    className="w-full mt-1 border-primary/30 text-primary hover:bg-primary/10"
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
                      value={formData.Branch_ID || ""} 
                      onValueChange={(val) => setFormData({ ...formData, Branch_ID: val })}
                    >
                      <SelectTrigger className="bg-background border-yellow-500/30">
                        <SelectValue placeholder="-- ใช้สาขาปัจจุบัน --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- ใช้สาขาปัจจุบัน --</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                            {b.Branch_Name} ({b.Branch_ID})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
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
                    className="bg-slate-800 border-slate-700"
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
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
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
                            <MapPin className="w-4 h-4" /> จุดต้นทาง <span className="text-muted-foreground text-xs">({originLocations.length})</span>
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
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Latitude"
                                        value={origin.lat}
                                        onChange={(e) => updateOrigin(index, 'lat', e.target.value)}
                                        className="bg-background border-input text-xs"
                                    />
                                    <Input
                                        placeholder="Longitude"
                                        value={origin.lng}
                                        onChange={(e) => updateOrigin(index, 'lng', e.target.value)}
                                        className="bg-background border-input text-xs"
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 flex justify-end">
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => removeOrigin(index)}
                                    disabled={origins.length === 1}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 text-xs"
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
                        <Label className="text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> จุดปลายทาง <span className="text-muted-foreground text-xs">({destinationLocations.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addDestination} className="border-indigo-500/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300">
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
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Latitude"
                                        value={dest.lat}
                                        onChange={(e) => updateDestination(index, 'lat', e.target.value)}
                                        className="bg-background border-input text-xs"
                                    />
                                    <Input
                                        placeholder="Longitude"
                                        value={dest.lng}
                                        onChange={(e) => updateDestination(index, 'lng', e.target.value)}
                                        className="bg-background border-input text-xs"
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 flex justify-end">
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => removeDestination(index)}
                                    disabled={destinations.length === 1}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 text-xs"
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
                <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 relative group">
                    {/* Header with Remove Button */}
                    <div className="flex justify-between items-center mb-3">
                        <Label className="text-indigo-400 font-medium">
                            รถคันที่ {index + 1}
                        </Label>
                        {assignments.length > 1 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAssignment(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2 text-xs"
                            >
                                <X className="w-3 h-3 mr-1" /> ลบ
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="w-3 h-3" /> ประเภทรถ
                        </Label>
                        <select
                            value={assignment.Vehicle_Type}
                            onChange={(e) => updateAssignment(index, 'Vehicle_Type', e.target.value)}
                            className="w-full h-10 px-3 rounded-md bg-background border border-input text-foreground text-sm"
                        >
                            <option value="">ทั้งหมด (ไม่ระบุ)</option>
                            {/* Unique Vehicle Types from Data */}
                            {Array.from(new Set(vehicles.map((v) => v.vehicle_type).filter(Boolean))).map((type) => (
                            <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        </div>
                        <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
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
                                // Auto-set Type if not set or different
                                if (v.vehicle_type) {
                                    const newAssignments = [...assignments]
                                    newAssignments[index] = {
                                        ...newAssignments[index],
                                        Vehicle_Plate: v.vehicle_plate,
                                        Vehicle_Type: v.vehicle_type,
                                        Sub_ID: v.sub_id || newAssignments[index].Sub_ID
                                    }
                                    setAssignments(newAssignments)
                                }
                            }}
                            placeholder="พิมพ์ทะเบียนรถ..."
                            className="bg-background border-input text-sm"
                        />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs text-slate-400">
                           <User className="w-3 h-3" /> คนขับ
                        </Label>
                        <DriverAutocomplete
                            value={assignment.Driver_ID}
                            onChange={(val) => updateAssignment(index, 'Driver_ID', val)}
                            drivers={drivers}
                            onSelect={(d) => {
                                const newAssignments = [...assignments]
                                newAssignments[index] = {
                                    ...newAssignments[index],
                                    Driver_ID: d.Driver_ID,
                                    Sub_ID: d.Sub_ID || newAssignments[index].Sub_ID,
                                    // Use driver default if explicitly set, otherwise keep current
                                    Show_Price_To_Driver: d.Show_Price_Default ?? newAssignments[index].Show_Price_To_Driver
                                }
                                setAssignments(newAssignments)
                            }}
                            className="bg-slate-800 border-slate-700 text-sm"
                        />
                    </div>

                    {canViewPrice && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                            {assignment.Show_Price_To_Driver ? (
                                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">โชว์ค่าเที่ยวให้คนขับเห็น</span>
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
                                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Zone Mismatch</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                งานโซน: <span className="text-foreground">{ZONES.find(z => z.id === jobZone)?.name || jobZone}</span> <br/>
                                                รถประจำโซน: <span className="text-foreground">{ZONES.find(z => z.id === vehicleZone)?.name || vehicleZone}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(maxWeight > 0 || maxVolume > 0) && (
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-muted-foreground">ตรวจสอบการบรรทุก (Capacity)</span>
                                        {(isOverweight || isOverVolume) && (
                                            <span className="text-[10px] bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                                OVERLOAD
                                            </span>
                                        )}
                                    </div>
                                )}
                                
                                {maxWeight > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                            <span className={isOverweight ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                                                น้ำหนัก: {jobWeight.toLocaleString()} / {maxWeight.toLocaleString()} kg
                                            </span>
                                            <span className={isOverweight ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"}>
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
                                        <div className="flex justify-between text-[10px]">
                                            <span className={isOverVolume ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                                                ปริมาตร: {jobVolume.toLocaleString()} / {maxVolume.toLocaleString()} m³
                                            </span>
                                            <span className={isOverVolume ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"}>
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
                className="w-full border-dashed border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> เพิ่มรถอีกคัน
              </Button>

               <div className="space-y-2 pt-2">
                <Label className="flex items-center gap-1">
                   หมายเหตุ (ทุกคัน)
                </Label>
                <Textarea
                  value={formData.Notes}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  className="bg-slate-800 border-slate-700"
                  rows={3}
                />
              </div>
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
                    onChange={(e) => setFormData({ ...formData, Price_Cust_Total: Number(e.target.value) })}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                   <Label>ค่าจ้างรถ (บาท)</Label>
                   <Input
                    type="number"
                    value={formData.Cost_Driver_Total}
                    onChange={(e) => setFormData({ ...formData, Cost_Driver_Total: Number(e.target.value) })}
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
                        <Label className="text-xs text-muted-foreground">รายการ</Label>
                        <select
                            value={cost.type}
                            onChange={(e) => updateExtraCost(index, 'type', e.target.value)}
                            className="w-full h-9 px-2 rounded-md bg-background border border-input text-foreground text-sm"
                        >
                            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-muted-foreground">จ่ายรถ</Label>
                        <Input
                            type="number"
                            value={cost.cost_driver}
                            onChange={(e) => updateExtraCost(index, 'cost_driver', e.target.value)}
                            className="bg-background border-input h-9"
                        />
                    </div>
                     <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-muted-foreground">เก็บลูกค้า</Label>
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

                <div className="p-3 bg-muted rounded-lg flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">รวมกำไรเบื้องต้น</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {(
                            (formData.Price_Cust_Total + extraCosts.reduce((sum, c) => sum + c.charge_cust, 0)) - 
                            (formData.Cost_Driver_Total + extraCosts.reduce((sum, c) => sum + c.cost_driver, 0))
                        ).toLocaleString()} บาท
                    </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-border">
            {mode === 'edit' && canDelete && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> ลบงาน
                </Button>
            )}
            <div className={`flex gap-3 ${mode === 'create' ? 'w-full justify-end' : ''}`}>
                <Button type="button" variant="outline" onClick={() => setShow(false)} className="border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                ยกเลิก
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === 'create' ? 'สร้างงาน' : 'บันทึกการแก้ไข'}
                </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
