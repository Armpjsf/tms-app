"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Save,
  X,
  CreditCard,
  Loader2,
  FileSpreadsheet
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  getAllCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  Customer,
  createBulkCustomers
} from "@/lib/supabase/customers"
import { ExcelImport } from "@/components/ui/excel-import"

export default function CustomersSettingsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    Customer_ID: "",
    Customer_Name: "",
    Contact_Person: "",
    Phone: "",
    Email: "",
    Address: "",
    Tax_ID: ""
  })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data } = await getAllCustomers(1, 100, searchQuery)
    setCustomers(data)
    setLoading(false)
  }, [searchQuery])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchCustomers])

  const updateForm = (field: keyof Customer, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      Customer_ID: "",
      Customer_Name: "",
      Contact_Person: "",
      Phone: "",
      Email: "",
      Address: "",
      Tax_ID: ""
    })
    setEditingCustomer(null)
  }

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData(customer)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.Customer_Name) {
      alert("กรุณาระบุชื่อลูกค้า")
      return
    }

    setSaving(true)
    try {
      if (editingCustomer && editingCustomer.Customer_ID) {
        // Update
        const result = await updateCustomer(editingCustomer.Customer_ID, formData)
        if (!result.success) throw result.error
      } else {
        // Create
        const result = await createCustomer(formData)
        if (!result.success) throw result.error
      }
      
      setIsDialogOpen(false)
      resetForm()
      fetchCustomers()
    } catch (e) {
      console.error(e)
      alert("เกิดข้อผิดพลาดในการบันทึก")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (customerId: string) => {
    if (confirm("ยืนยันลบข้อมูลลูกค้านี้?")) {
      await deleteCustomer(customerId)
      fetchCustomers()
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-emerald-400" />
            จัดการลูกค้า
          </h1>
          <p className="text-sm text-slate-400 mt-1">ฐานข้อมูลลูกค้า (Master Data)</p>
        </div>
        <div className="flex gap-2">
            <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800">
                        <FileSpreadsheet size={16} /> 
                        นำเข้า Excel
                    </Button>
                }
                title="นำเข้าข้อมูลลูกค้า"
                onImport={createBulkCustomers}
                templateData={[
                    { 
                        Customer_Name: "บริษัท ตัวอย่าง จำกัด", 
                        Contact_Person: "คุณสมชาย", 
                        Phone: "02-123-4567", 
                        Email: "contact@example.com",
                        Address: "123 ถ.สุขุมวิท กทม.",
                        Tax_ID: "1234567890123" 
                    }
                ]}
                templateFilename="template_customers.xlsx"
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> เพิ่มลูกค้า
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">รหัสลูกค้า (Auto if empty)</Label>
                  <Input
                    value={formData.Customer_ID || ""}
                    onChange={(e) => updateForm("Customer_ID", e.target.value)}
                    placeholder="Auto Generate"
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={!!editingCustomer}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> เลขประจำตัวผู้เสียภาษี
                  </Label>
                  <Input
                    value={formData.Tax_ID || ""}
                    onChange={(e) => updateForm("Tax_ID", e.target.value)}
                    placeholder="0123456789012"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> ชื่อบริษัท/ลูกค้า *
                </Label>
                <Input
                  value={formData.Customer_Name || ""}
                  onChange={(e) => updateForm("Customer_Name", e.target.value)}
                  placeholder="บริษัท ตัวอย่าง จำกัด"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">ผู้ติดต่อ</Label>
                  <Input
                    value={formData.Contact_Person || ""}
                    onChange={(e) => updateForm("Contact_Person", e.target.value)}
                    placeholder="คุณสมชาย"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> เบอร์โทร
                  </Label>
                  <Input
                    value={formData.Phone || ""}
                    onChange={(e) => updateForm("Phone", e.target.value)}
                    placeholder="02-XXX-XXXX"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> อีเมล
                </Label>
                <Input
                  type="email"
                  value={formData.Email || ""}
                  onChange={(e) => updateForm("Email", e.target.value)}
                  placeholder="contact@company.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> ที่อยู่
                </Label>
                <Textarea
                  value={formData.Address || ""}
                  onChange={(e) => updateForm("Address", e.target.value)}
                  placeholder="ที่อยู่สำหรับออกใบแจ้งหนี้/ใบเสร็จ"
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  บันทึก
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-slate-700">
                  <X className="w-4 h-4 mr-2" /> ยกเลิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อหรือรหัสลูกค้า..."
            className="pl-10 bg-slate-900 border-slate-800 text-white"
          />
        </div>
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="text-slate-400 text-center py-12 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" /> กำลังโหลดข้อมูลลูกค้า...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.Customer_ID} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{customer.Customer_Name}</h3>
                      <p className="text-xs text-slate-500">{customer.Customer_ID}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span>Tax ID: {customer.Tax_ID || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{customer.Phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="truncate">{customer.Address || "-"}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-slate-700"
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> แก้ไข
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-slate-700 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(customer.Customer_ID)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Empty State */}
          {customers.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">ไม่พบข้อมูลลูกค้า</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
