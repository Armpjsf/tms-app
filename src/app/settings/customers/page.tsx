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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  Customer,
  createBulkCustomers
} from "@/lib/supabase/customers"
 import { createClient } from "@/utils/supabase/client"
import { ExcelImport } from "@/components/ui/excel-import"
import { useBranch } from "@/components/providers/branch-provider"

export default function CustomersSettingsPage() {
  const { branches, isAdmin, selectedBranch } = useBranch()
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
    Tax_ID: "",
    Branch_ID: ""
  })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from('Master_Customers').select('*')

      if (selectedBranch && selectedBranch !== 'All') {
        query = query.eq('Branch_ID', selectedBranch)
      }

      if (searchQuery) {
        query = query.or(`Customer_Name.ilike.%${searchQuery}%,Customer_ID.ilike.%${searchQuery}%`)
      }

      const { data } = await query.order('Customer_ID', { ascending: false }).limit(100)
      if (data) {
        setCustomers(data)
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedBranch])

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
      Tax_ID: "",
      Branch_ID: ""
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="text-emerald-500" />
            จัดการลูกค้า
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ฐานข้อมูลลูกค้า (Master Data)</p>
        </div>
        <div className="flex gap-2">
            <ExcelImport 
                trigger={
                    <Button variant="outline" className="gap-2 border-border hover:bg-muted">
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
          <DialogContent className="bg-background border-border text-foreground max-w-2xl shadow-2xl">
            <DialogHeader className="border-b border-border pb-4">
              <DialogTitle className="text-foreground">
                {editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {isAdmin && branches.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-yellow-500 font-bold">สาขา (Super Admin Only)</Label>
                    <Select 
                      value={formData.Branch_ID || ""} 
                      onValueChange={(val) => updateForm("Branch_ID", val)}
                    >
                      <SelectTrigger className="bg-card border-amber-500/50 text-foreground">
                        <SelectValue placeholder="-- เลือกสาขา --" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {branches.map(b => (
                          <SelectItem key={b.Branch_ID} value={b.Branch_ID} className="text-foreground">
                            {b.Branch_Name} ({b.Branch_ID})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">รหัสลูกค้า (Auto if empty)</Label>
                  <Input
                    value={formData.Customer_ID || ""}
                    onChange={(e) => updateForm("Customer_ID", e.target.value)}
                    placeholder="Auto Generate"
                    className="bg-card border-border text-foreground"
                    disabled={!!editingCustomer}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> เลขประจำตัวผู้เสียภาษี
                  </Label>
                  <Input
                    value={formData.Tax_ID || ""}
                    onChange={(e) => updateForm("Tax_ID", e.target.value)}
                    placeholder="0123456789012"
                    className="bg-card border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> ชื่อบริษัท/ลูกค้า *
                </Label>
                <Input
                  value={formData.Customer_Name || ""}
                  onChange={(e) => updateForm("Customer_Name", e.target.value)}
                  placeholder="บริษัท ตัวอย่าง จำกัด"
                  className="bg-card border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">ผู้ติดต่อ</Label>
                  <Input
                    value={formData.Contact_Person || ""}
                    onChange={(e) => updateForm("Contact_Person", e.target.value)}
                    placeholder="คุณสมชาย"
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> เบอร์โทร
                  </Label>
                  <Input
                    value={formData.Phone || ""}
                    onChange={(e) => updateForm("Phone", e.target.value)}
                    placeholder="02-XXX-XXXX"
                    className="bg-card border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> อีเมล
                </Label>
                <Input
                  type="email"
                  value={formData.Email || ""}
                  onChange={(e) => updateForm("Email", e.target.value)}
                  placeholder="contact@company.com"
                  className="bg-card border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> ที่อยู่
                </Label>
                <Textarea
                  value={formData.Address || ""}
                  onChange={(e) => updateForm("Address", e.target.value)}
                  placeholder="ที่อยู่สำหรับออกใบแจ้งหนี้/ใบเสร็จ"
                  className="bg-card border-border text-foreground min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-border mt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  บันทึก
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-border">
                  <X className="w-4 h-4 mr-2" /> ยกเลิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="mb-6 bg-card/50 p-2 rounded-xl border border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อหรือรหัสลูกค้า..."
            className="pl-10 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-center py-12 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" /> กำลังโหลดข้อมูลลูกค้า...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.Customer_ID} className="bg-card border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{customer.Customer_Name}</h3>
                      <p className="text-xs text-muted-foreground">{customer.Customer_ID}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="w-4 h-4 text-emerald-500/70" />
                    <span>Tax ID: {customer.Tax_ID || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 text-emerald-500/70" />
                    <span>Branch: {customer.Branch_ID || "HQ"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 text-emerald-500/70" />
                    <span>{customer.Phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-emerald-500/70" />
                    <span className="truncate">{customer.Address || "-"}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-border text-foreground hover:bg-muted"
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> แก้ไข
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
