"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createJob, updateJob, createBulkJobs, deleteJob } from "@/app/planning/actions"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"
import { LocationAutocomplete } from "@/components/location-autocomplete"
import { VehicleAutocomplete } from "@/components/vehicle-autocomplete"
import { DriverAutocomplete } from "@/components/driver-autocomplete"
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
  Check
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
  job?: any
  drivers: any[]
  vehicles: any[]
  customers?: any[]
  routes?: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
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
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
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
  onOpenChange: setControlledOpen
}: JobDialogProps) {
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
    Job_Status: job?.Job_Status || 'New'
  })

  // Multi-Assignment State
  const [assignments, setAssignments] = useState(
    job?.assignments && job.assignments.length > 0
      ? job.assignments
      : [{ Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '' }]
  )

  // Helper to safely parse JSON or return existing array
  const parseJson = (val: any, defaultVal: any) => {
    if (!val) return defaultVal
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch (e) {
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
            Driver_ID: job.Driver_ID || ''
        }])
    } else if (show && mode === 'create') {
        // Reset to one empty assignment
        setAssignments([{ Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '' }])
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
    if (destinations.length > 1) setDestinations(destinations.filter((_: any, i: number) => i !== index))
  }
  const updateDestination = (index: number, field: keyof LocationPoint, value: string) => {
    const updated = [...destinations]
    updated[index][field] = value
    setDestinations(updated)
  }

  const addAssignment = () => {
    setAssignments([...assignments, { Vehicle_Type: '4-Wheel', Vehicle_Plate: '', Driver_ID: '' }])
  }

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
        setAssignments(assignments.filter((_: any, i: number) => i !== index))
    }
  }

  const updateAssignment = (index: number, field: string, value: string) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], [field]: value }
    setAssignments(newAssignments)
    
    // Sync first assignment to main form data for backward compatibility / validation
    if (index === 0) {
        setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const addExtraCost = () => setExtraCosts([...extraCosts, { type: EXPENSE_TYPES[0], cost_driver: 0, charge_cust: 0 }])
  const removeExtraCost = (index: number) => setExtraCosts(extraCosts.filter((_: any, i: number) => i !== index))
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
        const invalidAssignment = assignments.find((a: any) => !a.Vehicle_Plate && !a.Driver_ID)
        // Strictly, user might want to assign LATER? 
        // User request: "Force to fill info completely"
        // So we should require at least Vehicle OR Driver? Or both?
        // Let's require at least Vehicle Plate OR Driver ID for each row.
        // Or maybe just ensure at least ONE assignment exists and is valid.
        
        assignments.forEach((a: any, i: number) => {
            if (!a.Vehicle_Plate && !a.Driver_ID) {
                errors.push(`กรุณาระบุข้อมูลรถหรือคนขับ สำหรับรถคันที่ ${i + 1}`)
            }
        })
    }
    
    return errors
  }

  const handleDelete = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) return
    
    setLoading(true)
    try {
        const result = await deleteJob(job.Job_ID)
        if (!result.success) throw new Error(result.message)
        setShow(false)
        router.refresh()
    } catch (error: any) {
        console.error(error)
        alert(error.message || 'ลบงานไม่สำเร็จ')
    } finally {
        setLoading(false)
    }
  }

  const handleCustomerSelect = (customer: any) => {
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
        const jobsToCreate = assignments.map((assignment: any) => ({
            ...baseData,
            // Per-job assignment details
            Vehicle_Type: assignment.Vehicle_Type,
            Vehicle_Plate: assignment.Vehicle_Plate,
            Driver_ID: assignment.Driver_ID,
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
            Driver_Name: drivers.find(d => d.Driver_ID === assignment.Driver_ID)?.Driver_Name || '',
        }

        const result = await updateJob(job.Job_ID, updateData)
        if (!result.success) throw new Error(result.message)
      }
      
      setShow(false)
      router.refresh()
    } catch (error: any) {
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
    { id: 'price', label: 'ราคา', icon: <Banknote className="w-4 h-4" /> },
  ] as const

  return (
    <Dialog open={show} onOpenChange={setShow}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900/95 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'create' ? 'สร้างงานใหม่' : 'แก้ไขงาน'}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
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
                    className="bg-slate-800/50 border-slate-700 text-slate-400"
                  />
                  <p className="text-xs text-slate-500">สร้างอัตโนมัติ</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTrackingLink}
                    className="w-full mt-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                  >
                    {copied ? <Check className="w-3 h-3 mr-2" /> : <LinkIcon className="w-3 h-3 mr-2" />}
                    {copied ? 'คัดลอกแล้ว' : 'Copy Tracking Link'}
                  </Button>
                </div>
                
                <div className="space-y-2">
                   <Label>สถานะงาน</Label>
                   <Select 
                      value={formData.Job_Status} 
                      onValueChange={(val) => setFormData({ ...formData, Job_Status: val })}
                   >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
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
                    className="bg-slate-800 border-slate-700"
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
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

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
                    routes.map((r: any) => r.Origin).filter(Boolean)
                 )) as string[]

                 const destinationLocations = Array.from(new Set(
                    routes.map((r: any) => r.Destination).filter(Boolean)
                 )) as string[]
                 
                 return (
                   <>
                    {/* Origins */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                        <Label className="text-emerald-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> จุดต้นทาง <span className="text-slate-500 text-xs">({originLocations.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addOrigin} className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                            <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                        </Button>
                        </div>
                        {origins.map((origin, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg">
                            <div className="col-span-1 flex items-center justify-center text-slate-500">
                                {index + 1}
                            </div>
                            <div className="col-span-11 grid grid-cols-1 gap-2">
                                <LocationAutocomplete
                                    placeholder="ชื่อโรงงาน/สถานที่"
                                    value={origin.name}
                                    onChange={(val) => updateOrigin(index, 'name', val)}
                                    locations={originLocations}
                                    className="bg-slate-900 border-slate-700"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Latitude"
                                        value={origin.lat}
                                        onChange={(e) => updateOrigin(index, 'lat', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-xs"
                                    />
                                    <Input
                                        placeholder="Longitude"
                                        value={origin.lng}
                                        onChange={(e) => updateOrigin(index, 'lng', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-xs"
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
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 text-xs"
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
                        <Label className="text-indigo-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> จุดปลายทาง <span className="text-slate-500 text-xs">({destinationLocations.length})</span>
                        </Label>
                        <Button type="button" size="sm" variant="outline" onClick={addDestination} className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300">
                            <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                        </Button>
                        </div>
                        {destinations.map((dest, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg">
                            <div className="col-span-1 flex items-center justify-center text-slate-500">
                                {index + 1}
                            </div>
                            <div className="col-span-11 grid grid-cols-1 gap-2">
                                <LocationAutocomplete
                                    placeholder="ชื่อลูกค้า/สถานที่ส่ง"
                                    value={dest.name}
                                    onChange={(val) => updateDestination(index, 'name', val)}
                                    locations={destinationLocations}
                                    className="bg-slate-900 border-slate-700"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Latitude"
                                        value={dest.lat}
                                        onChange={(e) => updateDestination(index, 'lat', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-xs"
                                    />
                                    <Input
                                        placeholder="Longitude"
                                        value={dest.lng}
                                        onChange={(e) => updateDestination(index, 'lng', e.target.value)}
                                        className="bg-slate-900 border-slate-700 text-xs"
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
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 text-xs"
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
              {assignments.map((assignment: any, index: number) => (
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
                        <Label className="flex items-center gap-1 text-xs text-slate-400">
                            <Truck className="w-3 h-3" /> ประเภทรถ
                        </Label>
                        <select
                            value={assignment.Vehicle_Type}
                            onChange={(e) => updateAssignment(index, 'Vehicle_Type', e.target.value)}
                            className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white text-sm"
                        >
                            <option value="">ทั้งหมด (ไม่ระบุ)</option>
                            {/* Unique Vehicle Types from Data */}
                            {Array.from(new Set(vehicles.map((v: any) => v.vehicle_type).filter(Boolean))).map((type: any) => (
                            <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        </div>
                        <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-xs text-slate-400">
                            <Truck className="w-3 h-3" /> ทะเบียนรถ
                        </Label>
                        <VehicleAutocomplete
                            value={assignment.Vehicle_Plate}
                            onChange={(val) => updateAssignment(index, 'Vehicle_Plate', val)}
                            vehicles={assignment.Vehicle_Type 
                                ? vehicles.filter((v: any) => v.vehicle_type === assignment.Vehicle_Type) 
                                : vehicles
                            }
                            onSelect={(v) => {
                                // Auto-set Type if not set or different
                                if (v.vehicle_type) {
                                    const newAssignments = [...assignments]
                                    newAssignments[index] = {
                                        ...newAssignments[index],
                                        Vehicle_Plate: v.vehicle_plate,
                                        Vehicle_Type: v.vehicle_type
                                    }
                                    setAssignments(newAssignments)
                                }
                            }}
                            placeholder="พิมพ์ทะเบียนรถ..."
                            className="bg-slate-800 border-slate-700 text-sm"
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
                            className="bg-slate-800 border-slate-700 text-sm"
                        />
                    </div>
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
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                   <Label>ค่าจ้างรถ (บาท)</Label>
                   <Input
                    type="number"
                    value={formData.Cost_Driver_Total}
                    onChange={(e) => setFormData({ ...formData, Cost_Driver_Total: Number(e.target.value) })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" /> ค่าใช้จ่ายเพิ่มเติม
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addExtraCost} className="border-slate-700 hover:bg-slate-800">
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                  </Button>
                </div>
                {extraCosts.map((cost, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg items-end">
                    <div className="col-span-4 space-y-1">
                        <Label className="text-xs text-slate-400">รายการ</Label>
                        <select
                            value={cost.type}
                            onChange={(e) => updateExtraCost(index, 'type', e.target.value)}
                            className="w-full h-9 px-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                        >
                            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-slate-400">จ่ายรถ</Label>
                        <Input
                            type="number"
                            value={cost.cost_driver}
                            onChange={(e) => updateExtraCost(index, 'cost_driver', e.target.value)}
                            className="bg-slate-900 border-slate-700 h-9"
                        />
                    </div>
                     <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-slate-400">เก็บลูกค้า</Label>
                        <Input
                            type="number"
                            value={cost.charge_cust}
                            onChange={(e) => updateExtraCost(index, 'charge_cust', e.target.value)}
                            className="bg-slate-900 border-slate-700 h-9"
                        />
                    </div>
                    <div className="col-span-2 flex justify-end">
                         <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost"
                            onClick={() => removeExtraCost(index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 w-9"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-slate-800 rounded-lg flex justify-between items-center text-sm">
                    <span className="text-slate-400">รวมกำไรเบื้องต้น</span>
                    <span className="font-bold text-emerald-400">
                        {(
                            (formData.Price_Cust_Total + extraCosts.reduce((sum, c) => sum + c.charge_cust, 0)) - 
                            (formData.Cost_Driver_Total + extraCosts.reduce((sum, c) => sum + c.cost_driver, 0))
                        ).toLocaleString()} บาท
                    </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-700/50">
            {mode === 'edit' && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> ลบงาน
                </Button>
            )}
            <div className={`flex gap-3 ${mode === 'create' ? 'w-full justify-end' : ''}`}>
                <Button type="button" variant="outline" onClick={() => setShow(false)} className="border-slate-700 hover:bg-slate-800 text-slate-300">
                ยกเลิก
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
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
