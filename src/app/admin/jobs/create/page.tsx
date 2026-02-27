"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createJob, getJobCreationData } from "@/app/planning/actions"
import { 
  ArrowLeft, 
  Package,
  User,
  MapPin,
  Truck,
  Calendar,
  Clock,
  Building2,
  Phone,
  FileText,
  Loader2,
  CheckCircle2,
  ChevronRight
} from "lucide-react"
import { CustomerAutocomplete } from "@/components/customer-autocomplete"

// Step indicator component
function StepIndicator({ steps, currentStep }: { steps: string[], currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              index < currentStep 
                ? 'bg-emerald-500 text-white' 
                : index === currentStep 
                ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {index < currentStep ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`text-sm hidden md:block ${index <= currentStep ? 'text-white' : 'text-slate-500'}`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${index < currentStep ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateJobPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Real data lists
  const [lists, setLists] = useState<{
    drivers: any[],
    vehicles: any[],
    customers: any[]
  }>({ drivers: [], vehicles: [], customers: [] })

  useEffect(() => {
    getJobCreationData().then(data => {
        console.log("Job Creation Data Loaded:", data)
        console.log("Customers Count:", data.customers.length)
        setLists(data)
    })
  }, [])

  const steps = ['ข้อมูลงาน', 'ข้อมูลลูกค้า', 'มอบหมายงาน', 'ยืนยัน']
  
  const [formData, setFormData] = useState({
    Job_ID: `JOB-${Date.now().toString().slice(-6)}`,
    Plan_Date: new Date().toISOString().split('T')[0],
    Plan_Time: '09:00',
    Priority: 'Normal',
    Customer_Name: '',
    Customer_Phone: '',
    Customer_Address: '',
    Origin_Location: '',
    Dest_Location: '',
    Route_Name: '',
    Driver_ID: '',
    Driver_Name: '',
    Vehicle_Plate: '',
    Notes: '',
    Cargo_Type: '',
    Weight: ''
  })

  // Autofill customer data when selected
  const handleCustomerSelect = (customer: any) => {
    setFormData(prev => ({
      ...prev,
      Customer_Name: customer.Customer_Name,
      Customer_Phone: customer.Phone || customer.Customer_Phone || '',
      Customer_Address: customer.Address || customer.Customer_Address || '',
      // Master Customers doesn't have location defaults, but we keep it safe
      Origin_Location: customer.Origin_Location || '', 
      Dest_Location: customer.Dest_Location || '' 
    }))
  }

  const handleDriverChange = (driverId: string) => {
    const driver = lists.drivers.find(d => d.Driver_ID === driverId)
    updateForm('Driver_ID', driverId)
    if (driver) {
      updateForm('Driver_Name', driver.Driver_Name || '')
      // Auto-select vehicle if driver has one assigned and current is empty
      if (driver.Vehicle_Plate && !formData.Vehicle_Plate) {
        updateForm('Vehicle_Plate', driver.Vehicle_Plate)
      }
    }
  }

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await createJob({
        Job_ID: formData.Job_ID,
        Plan_Date: formData.Plan_Date,
        Customer_Name: formData.Customer_Name,
        Origin_Location: formData.Origin_Location,
        Dest_Location: formData.Dest_Location,
        Route_Name: `${formData.Origin_Location} - ${formData.Dest_Location}`, 
        Driver_ID: formData.Driver_ID,
        Driver_Name: formData.Driver_Name,
        Vehicle_Plate: formData.Vehicle_Plate,
        Cargo_Type: formData.Cargo_Type,
        Notes: formData.Notes,
        Weight_Kg: formData.Weight ? parseFloat(formData.Weight) : 0,
        Job_Status: 'New'
      })

      if (result.success) {
        router.push('/planning')
      } else {
        alert('เกิดข้อผิดพลาด: ' + result.message)
      }
    } catch (e) {
      console.error(e)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => currentStep < steps.length - 1 && setCurrentStep(prev => prev + 1)
  const prevStep = () => currentStep > 0 && setCurrentStep(prev => prev - 1)

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/planning">
          <Button variant="outline" size="icon" className="h-10 w-10 border-slate-700 bg-slate-900 hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">สร้างงานใหม่</h1>
          <p className="text-sm text-slate-400">กรอกข้อมูลเพื่อสร้างงานขนส่ง (เชื่อมต่อฐานข้อมูลจริง)</p>
        </div>
      </div>

      {/* Steps */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Step Content */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardContent className="p-6">
          
          {/* Step 1: Job Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">ข้อมูลงาน</h2>
                  <p className="text-sm text-slate-400">กำหนด Job ID และวันเวลาที่ต้องการ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-300">Job ID</Label>
                  <Input 
                    value={formData.Job_ID}
                    onChange={(e) => updateForm('Job_ID', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">ความเร่งด่วน</Label>
                  <Select value={formData.Priority} onValueChange={(val) => updateForm('Priority', val)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="เลือกความเร่งด่วน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">ปกติ</SelectItem>
                      <SelectItem value="High">เร่งด่วน</SelectItem>
                      <SelectItem value="Urgent">ด่วนมาก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> วันที่
                  </Label>
                  <Input 
                    type="date"
                    value={formData.Plan_Date}
                    onChange={(e) => updateForm('Plan_Date', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> เวลา
                  </Label>
                  <Input 
                    type="time"
                    value={formData.Plan_Time}
                    onChange={(e) => updateForm('Plan_Time', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-300">ประเภทสินค้า</Label>
                  <Input 
                    placeholder="เช่น เอกสาร, อาหาร, วัสดุก่อสร้าง"
                    value={formData.Cargo_Type}
                    onChange={(e) => updateForm('Cargo_Type', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">น้ำหนัก (kg)</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={formData.Weight}
                    onChange={(e) => updateForm('Weight', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Customer Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">ข้อมูลลูกค้า</h2>
                  <p className="text-sm text-slate-400">ข้อมูลผู้รับสินค้าและที่อยู่</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> ชื่อลูกค้า / บริษัท
                  </Label>
                  <CustomerAutocomplete 
                    value={formData.Customer_Name}
                    onChange={(val) => updateForm('Customer_Name', val)}
                    customers={lists.customers}
                    onSelect={handleCustomerSelect}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> เบอร์โทรศัพท์
                  </Label>
                  <Input 
                    placeholder="08X-XXX-XXXX"
                    value={formData.Customer_Phone}
                    onChange={(e) => updateForm('Customer_Phone', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> ที่อยู่จัดส่ง
                </Label>
                <Textarea 
                  placeholder="กรอกที่อยู่เต็ม..."
                  value={formData.Customer_Address}
                  onChange={(e) => updateForm('Customer_Address', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-300">ต้นทาง</Label>
                  <Input 
                    placeholder="สถานที่รับสินค้า"
                    value={formData.Origin_Location}
                    onChange={(e) => updateForm('Origin_Location', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">ปลายทาง</Label>
                  <Input 
                    placeholder="สถานที่ส่งสินค้า"
                    value={formData.Dest_Location}
                    onChange={(e) => updateForm('Dest_Location', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Assignment */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">มอบหมายงาน</h2>
                  <p className="text-sm text-slate-400">เลือกคนขับและรถที่จะใช้</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-300">คนขับ</Label>
                  <Select value={formData.Driver_ID} onValueChange={handleDriverChange}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="เลือกคนขับ" />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.drivers.map(d => (
                        <SelectItem key={d.Driver_ID} value={d.Driver_ID}>
                          {d.Driver_Name} ({d.Mobile_No})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">ทะเบียนรถ</Label>
                  <Select value={formData.Vehicle_Plate} onValueChange={(val) => updateForm('Vehicle_Plate', val)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="เลือกทะเบียนรถ" />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.vehicles.map(v => (
                        <SelectItem key={v.vehicle_plate} value={v.vehicle_plate}>
                          {v.vehicle_plate} ({v.vehicle_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> หมายเหตุ
                </Label>
                <Textarea 
                  placeholder="รายละเอียดเพิ่มเติม..."
                  value={formData.Notes}
                  onChange={(e) => updateForm('Notes', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">ยืนยันข้อมูล</h2>
                  <p className="text-sm text-slate-400">ตรวจสอบข้อมูลก่อนสร้างงาน</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">ข้อมูลงาน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-slate-400">Job ID:</span> <span className="text-white font-medium">{formData.Job_ID}</span></p>
                    <p><span className="text-slate-400">วันที่:</span> <span className="text-white">{formData.Plan_Date} {formData.Plan_Time}</span></p>
                    <p><span className="text-slate-400">ประเภท:</span> <span className="text-white">{formData.Cargo_Type || '-'}</span></p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">ลูกค้า</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-slate-400">ชื่อ:</span> <span className="text-white">{formData.Customer_Name || '-'}</span></p>
                    <p><span className="text-slate-400">โทร:</span> <span className="text-white">{formData.Customer_Phone || '-'}</span></p>
                    <p><span className="text-slate-400">เส้นทาง:</span> <span className="text-white">{formData.Origin_Location || '-'} → {formData.Dest_Location || '-'}</span></p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">มอบหมาย</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-8 text-sm">
                    <p><span className="text-slate-400">คนขับ:</span> <span className="text-white">{formData.Driver_Name || 'ยังไม่ระบุ'}</span></p>
                    <p><span className="text-slate-400">รถ:</span> <span className="text-white">{formData.Vehicle_Plate || 'ยังไม่ระบุ'}</span></p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} className="border-slate-700">
              ย้อนกลับ
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
                ถัดไป <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-green-600">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                สร้างงาน
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
