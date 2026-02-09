"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createJob, updateJob } from "@/app/planning/actions"
import { 
  Loader2, 
  Plus, 
  X, 
  MapPin, 
  Truck, 
  Package,
  Building2,
  Calendar,
  Banknote,
  FileText
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
  drivers,
  vehicles,
  customers = [],
  trigger,
  open,
  onOpenChange
}: JobDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'assign' | 'price'>('info')
  
  const isControlled = open !== undefined
  const show = isControlled ? open : internalOpen
  const setShow = isControlled ? onOpenChange! : setInternalOpen

  // Form State
  const [formData, setFormData] = useState({
    Job_ID: job?.Job_ID || generateJobId(),
    Pickup_Date: job?.Pickup_Date || job?.Plan_Date || new Date().toISOString().split('T')[0],
    Delivery_Date: job?.Delivery_Date || new Date().toISOString().split('T')[0],
    Customer_Name: job?.Customer_Name || '',
    Cargo_Type: job?.Cargo_Type || '',
    Vehicle_Type: job?.Vehicle_Type || '4-Wheel',
    Vehicle_Plate: job?.Vehicle_Plate || '',
    Driver_ID: job?.Driver_ID || '',
    Notes: job?.Notes || '',
    Price_Cust_Total: job?.Price_Cust_Total || 0,
    Cost_Driver_Total: job?.Cost_Driver_Total || 0,
    Job_Status: job?.Job_Status || 'New'
  })

  // Multi-point origins
  const [origins, setOrigins] = useState<LocationPoint[]>(
    job?.origins || [{ name: '', lat: '', lng: '' }]
  )

  // Multi-point destinations
  const [destinations, setDestinations] = useState<LocationPoint[]>(
    job?.destinations || [{ name: '', lat: '', lng: '' }]
  )

  // Extra costs
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>(
    job?.extra_costs || []
  )

  // Generate new ID on dialog open (create mode)
  useEffect(() => {
    if (show && mode === 'create') {
      setFormData(prev => ({ ...prev, Job_ID: generateJobId() }))
    }
  }, [show, mode])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Combine form data with arrays
      const jobData = {
        ...formData,
        Plan_Date: formData.Pickup_Date,
        Origin_Location: origins.map(o => o.name).join(' → '),
        Dest_Location: destinations.map(d => d.name).join(' → '),
        Route_Name: `${origins[0]?.name || ''} → ${destinations[destinations.length-1]?.name || ''}`,
        Driver_Name: drivers.find(d => d.Driver_ID === formData.Driver_ID)?.Driver_Name || '',
        // Store arrays as JSON strings for now
        origins_json: JSON.stringify(origins),
        destinations_json: JSON.stringify(destinations),
        extra_costs_json: JSON.stringify(extraCosts),
      }

      if (mode === 'create') {
        await createJob(jobData)
      } else {
        await updateJob(job.Job_ID, jobData)
      }
      
      setShow(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Job ID</Label>
                  <Input
                    value={formData.Job_ID}
                    disabled
                    className="bg-slate-800/50 border-slate-700 text-slate-400"
                  />
                  <p className="text-xs text-slate-500">สร้างอัตโนมัติ</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> วันที่รับ
                  </Label>
                  <Input
                    type="date"
                    value={formData.Pickup_Date}
                    onChange={(e) => setFormData({ ...formData, Pickup_Date: e.target.value })}
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
                  {customers.length > 0 ? (
                    <select
                      value={formData.Customer_Name}
                      onChange={(e) => setFormData({ ...formData, Customer_Name: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="">เลือกลูกค้า</option>
                      {customers.map((c: any) => (
                        <option key={c.Customer_ID} value={c.Customer_Name}>
                          {c.Customer_Name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={formData.Customer_Name}
                      onChange={(e) => setFormData({ ...formData, Customer_Name: e.target.value })}
                      placeholder="ชื่อลูกค้า"
                      required
                      className="bg-slate-800 border-slate-700"
                    />
                  )}
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
          {activeTab === 'location' && (
            <div className="space-y-6">
              {/* Origins */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-emerald-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> จุดต้นทาง
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addOrigin} className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                  </Button>
                </div>
                {origins.map((origin, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg">
                    <div className="col-span-5">
                      <Input
                        placeholder="ชื่อโรงงาน/สถานที่"
                        value={origin.name}
                        onChange={(e) => updateOrigin(index, 'name', e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Latitude"
                        value={origin.lat}
                        onChange={(e) => updateOrigin(index, 'lat', e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Longitude"
                        value={origin.lng}
                        onChange={(e) => updateOrigin(index, 'lng', e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost"
                        onClick={() => removeOrigin(index)}
                        disabled={origins.length === 1}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Destinations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-blue-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> จุดปลายทาง
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addDestination} className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มจุด
                  </Button>
                </div>
                {destinations.map((dest, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg">
                    <div className="col-span-5">
                      <Input
                        placeholder="ชื่อโรงงาน/สถานที่"
                        value={dest.name}
                        onChange={(e) => updateDestination(index, 'name', e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Latitude"
                        value={dest.lat}
                        onChange={(e) => updateDestination(index, 'lat', e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Longitude"
                        value={dest.lng}
                        onChange={(e) => updateDestination(index, 'lng', e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost"
                        onClick={() => removeDestination(index)}
                        disabled={destinations.length === 1}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: มอบหมาย */}
          {activeTab === 'assign' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ประเภทรถ</Label>
                  <select
                    value={formData.Vehicle_Type}
                    onChange={(e) => setFormData({ ...formData, Vehicle_Type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="4-Wheel">4 ล้อ</option>
                    <option value="6-Wheel">6 ล้อ</option>
                    <option value="10-Wheel">10 ล้อ</option>
                    <option value="Trailer">หางพ่วง</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>ทะเบียนรถ</Label>
                  <select
                    value={formData.Vehicle_Plate}
                    onChange={(e) => setFormData({ ...formData, Vehicle_Plate: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">เลือกทะเบียน</option>
                    {vehicles.map((v: any) => (
                      <option key={v.vehicle_plate || v.Vehicle_Plate} value={v.vehicle_plate || v.Vehicle_Plate}>
                        {v.vehicle_plate || v.Vehicle_Plate} {v.vehicle_type ? `(${v.vehicle_type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>คนขับ</Label>
                  <select
                    value={formData.Driver_ID}
                    onChange={(e) => setFormData({ ...formData, Driver_ID: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">เลือกคนขับ</option>
                    {drivers.map((d: any) => (
                      <option key={d.Driver_ID} value={d.Driver_ID}>
                        {d.Driver_Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={formData.Notes}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  className="bg-slate-800 border-slate-700 min-h-[100px]"
                />
              </div>

              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label>สถานะ</Label>
                  <select
                    value={formData.Job_Status}
                    onChange={(e) => setFormData({ ...formData, Job_Status: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="New">New</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Picked Up">Picked Up</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Complete">Complete</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Tab: ราคา */}
          {activeTab === 'price' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Label className="text-emerald-400">ค่าขนส่งวางบิลลูกค้า</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                    <Input
                      type="number"
                      value={formData.Price_Cust_Total}
                      onChange={(e) => setFormData({ ...formData, Price_Cust_Total: Number(e.target.value) })}
                      className="pl-8 bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Label className="text-indigo-400">ค่าขนส่งจ่ายรถ</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                    <Input
                      type="number"
                      value={formData.Cost_Driver_Total}
                      onChange={(e) => setFormData({ ...formData, Cost_Driver_Total: Number(e.target.value) })}
                      className="pl-8 bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Extra Costs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-amber-400">ค่าใช้จ่ายอื่น</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addExtraCost} className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                  </Button>
                </div>
                
                {/* Header */}
                {extraCosts.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 px-3 text-xs text-slate-400">
                    <div className="col-span-4">ประเภท</div>
                    <div className="col-span-3 text-center">จ่ายรถ</div>
                    <div className="col-span-3 text-center">เก็บลูกค้า</div>
                    <div className="col-span-2"></div>
                  </div>
                )}
                
                {extraCosts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">ยังไม่มีค่าใช้จ่ายเพิ่มเติม</p>
                ) : (
                  extraCosts.map((cost, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg">
                      <div className="col-span-4">
                        <select
                          value={cost.type}
                          onChange={(e) => updateExtraCost(index, 'type', e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm"
                        >
                          {EXPENSE_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-400 text-xs">฿</span>
                          <Input
                            type="number"
                            value={cost.cost_driver}
                            onChange={(e) => updateExtraCost(index, 'cost_driver', e.target.value)}
                            placeholder="จ่ายรถ"
                            className="pl-6 bg-slate-900 border-slate-700 text-sm"
                          />
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400 text-xs">฿</span>
                          <Input
                            type="number"
                            value={cost.charge_cust}
                            onChange={(e) => updateExtraCost(index, 'charge_cust', e.target.value)}
                            placeholder="เก็บลูกค้า"
                            className="pl-6 bg-slate-900 border-slate-700 text-sm"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <span className={`text-xs ${cost.charge_cust - cost.cost_driver >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {cost.charge_cust - cost.cost_driver >= 0 ? '+' : ''}{(cost.charge_cust - cost.cost_driver).toLocaleString()}
                        </span>
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost"
                          onClick={() => removeExtraCost(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Summary */}
                {extraCosts.length > 0 && (
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">รวมจ่ายรถ</p>
                        <p className="text-indigo-400 font-medium">฿{extraCosts.reduce((sum, c) => sum + c.cost_driver, 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">รวมเก็บลูกค้า</p>
                        <p className="text-emerald-400 font-medium">฿{extraCosts.reduce((sum, c) => sum + c.charge_cust, 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-xs mb-1">กำไร</p>
                        <p className={`font-medium ${extraCosts.reduce((sum, c) => sum + (c.charge_cust - c.cost_driver), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ฿{extraCosts.reduce((sum, c) => sum + (c.charge_cust - c.cost_driver), 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grand Total Summary */}
              <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-lg border border-slate-600">
                <h4 className="text-white font-medium mb-3">สรุปรายรับ-รายจ่าย</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ค่าขนส่ง (ลูกค้า)</span>
                      <span className="text-emerald-400">฿{formData.Price_Cust_Total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ค่าใช้จ่ายอื่น (ลูกค้า)</span>
                      <span className="text-emerald-400">฿{extraCosts.reduce((sum, c) => sum + c.charge_cust, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-600 pt-2">
                      <span className="text-white font-medium">รวมรายรับ</span>
                      <span className="text-emerald-400 font-bold">฿{(formData.Price_Cust_Total + extraCosts.reduce((sum, c) => sum + c.charge_cust, 0)).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ค่าขนส่ง (จ่ายรถ)</span>
                      <span className="text-indigo-400">฿{formData.Cost_Driver_Total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ค่าใช้จ่ายอื่น (จ่ายรถ)</span>
                      <span className="text-indigo-400">฿{extraCosts.reduce((sum, c) => sum + c.cost_driver, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-600 pt-2">
                      <span className="text-white font-medium">รวมรายจ่าย</span>
                      <span className="text-indigo-400 font-bold">฿{(formData.Cost_Driver_Total + extraCosts.reduce((sum, c) => sum + c.cost_driver, 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-600 flex justify-between items-center">
                  <span className="text-white font-medium">กำไรขั้นต้น</span>
                  <span className={`text-lg font-bold ${
                    (formData.Price_Cust_Total + extraCosts.reduce((sum, c) => sum + c.charge_cust, 0)) - 
                    (formData.Cost_Driver_Total + extraCosts.reduce((sum, c) => sum + c.cost_driver, 0)) >= 0 
                      ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    ฿{(
                      (formData.Price_Cust_Total + extraCosts.reduce((sum, c) => sum + c.charge_cust, 0)) - 
                      (formData.Cost_Driver_Total + extraCosts.reduce((sum, c) => sum + c.cost_driver, 0))
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation + Submit */}
          <div className="flex justify-between pt-4 border-t border-slate-700">
            <div className="flex gap-2">
              {activeTab !== 'info' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab)
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id)
                  }}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  ← ก่อนหน้า
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShow(false)}>
                ยกเลิก
              </Button>
              {activeTab !== 'price' ? (
                <Button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(t => t.id === activeTab)
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id)
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  ถัดไป →
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'create' ? 'สร้างงาน' : 'บันทึก'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
