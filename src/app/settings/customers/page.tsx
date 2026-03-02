"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
    Plus, 
    Edit, 
    Trash2, 
    Search, 
    Loader2, 
    Building2,
    FileSpreadsheet,
    Phone,
    Mail,
    MapPin,
    Save,
    X,
    CreditCard,
    TrendingUp
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExcelImport } from "@/components/ui/excel-import"
import { createBulkCustomers, getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/supabase/customers"
import { getExecutiveKPIs } from "@/lib/supabase/analytics"
import { cn } from "@/lib/utils"

export default function CustomersSettingsPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [formData, setFormData] = useState<any>({
    Customer_ID: "",
    Customer_Name: "",
    Tax_ID: "",
    Branch_ID: "",
    Phone: "",
    Address: "",
    Email: "",
  })
  const [saving, setSaving] = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const [result, kpiData] = await Promise.all([
        getAllCustomers(1, 100, searchQuery),
        getExecutiveKPIs()
    ])
    setCustomers(result.data)
    setKpis(kpiData)
    setLoading(false)
  }, [searchQuery])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData(customer)
    } else {
      setEditingCustomer(null)
      setFormData({
        Customer_ID: "",
        Customer_Name: "",
        Tax_ID: "",
        Branch_ID: "",
        Phone: "",
        Address: "",
        Email: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.Customer_Name) return alert("กรุณากรอกชื่อลูกค้า")
    setSaving(true)
    try {
      if (editingCustomer) {
        await updateCustomer(formData.Customer_ID, formData)
      } else {
        await createCustomer(formData)
      }
      setIsDialogOpen(false)
      loadCustomers()
    } catch (error) {
      console.error(error)
      alert("เกิดข้อผิดพลาดในการบันทึก")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบข้อมูลลูกค้า?")) return
    try {
      await deleteCustomer(id)
      loadCustomers()
    } catch (error) {
      console.error(error)
      alert("เกิดข้อผิดพลาดในการลบ")
    }
  }

  const updateForm = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  return (
    <DashboardLayout>
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-white/40 p-10 rounded-[2.5rem] border border-white/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Building2 size={32} />
            </div>
            Customer CRM
          </h1>
          <p className="text-gray-500 font-bold ml-[4.5rem] uppercase tracking-[0.2em] text-[10px]">Master Data • Client Relationship Management</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <ExcelImport 
                trigger={
                    <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl">
                        <FileSpreadsheet size={20} className="mr-2" /> 
                        Import Excel
                    </PremiumButton>
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
            <PremiumButton onClick={() => handleOpenDialog()} className="h-14 px-8 rounded-2xl shadow-emerald-500/20">
              <Plus size={24} className="mr-2" />
              เพิ่มลูกค้า
            </PremiumButton>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      {!loading && kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
                { label: "Partner Customers", value: customers.length, icon: Building2, color: "emerald", trend: `${kpis.revenue.growth.toFixed(1)}%` },
                { label: "Monthly Revenue", value: `฿${kpis.revenue.current.toLocaleString()}`, icon: CreditCard, color: "blue", trend: "Target Focus" },
                { label: "Profit Margin", value: `${kpis.margin.current.toFixed(1)}%`, icon: TrendingUp, color: "purple", trend: "Optimal" },
            ].map((stat, idx) => (
                <PremiumCard key={idx} className="p-8 group backdrop-blur-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className={cn(
                            "p-3 rounded-2xl text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                            stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                            stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" : "bg-purple-500 shadow-purple-500/20"
                        )}>
                            <stat.icon size={20} />
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{stat.trend}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                    </div>
                </PremiumCard>
            ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-12 relative group max-w-2xl">
        <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4 px-4">
            <Search className="text-emerald-500 animate-pulse" size={24} />
            <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อหรือรหัสลูกค้า..."
                className="bg-transparent border-none focus-visible:ring-0 text-xl font-black text-gray-900 placeholder:text-gray-300 tracking-tighter"
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16" />
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                        <Building2 size={24} />
                    </div>
                    {editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
                  </DialogTitle>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">ชื่อลูกค้า/บริษัท *</Label>
                <Input
                  value={formData.Customer_Name}
                  onChange={(e) => updateForm("Customer_Name", e.target.value)}
                  placeholder="เช่น บริษัท โลจิสติกส์ ไทย จำกัด"
                  className="bg-gray-50 border-gray-100 text-xl font-black tracking-tighter rounded-2xl h-14"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">เบอร์โทรศัพท์</Label>
                  <Input
                    value={formData.Phone || ""}
                    onChange={(e) => updateForm("Phone", e.target.value)}
                    placeholder="02-XXX-XXXX"
                    className="bg-gray-50 border-gray-100 rounded-xl h-12 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">อีเมล</Label>
                  <Input
                    value={formData.Email || ""}
                    onChange={(e) => updateForm("Email", e.target.value)}
                    placeholder="contact@company.com"
                    className="bg-gray-50 border-gray-100 rounded-xl h-12 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  ที่อยู่รับสินค้า/ออกใบกำกับ
                </Label>
                <Textarea
                  value={formData.Address || ""}
                  onChange={(e) => updateForm("Address", e.target.value)}
                  placeholder="เลขที่, อาคาร, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด"
                  className="bg-gray-50 border-gray-100 rounded-2xl min-h-[100px] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">รหัสลูกค้า (Auto if empty)</Label>
                  <Input
                    value={formData.Customer_ID || ""}
                    onChange={(e) => updateForm("Customer_ID", e.target.value)}
                    placeholder="Auto Generate"
                    className="bg-gray-50 border-gray-100 rounded-xl h-12 font-bold"
                    disabled={!!editingCustomer}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">เลขประจำตัวผู้เสียภาษี</Label>
                  <Input
                    value={formData.Tax_ID || ""}
                    onChange={(e) => updateForm("Tax_ID", e.target.value)}
                    placeholder="0123456789012"
                    className="bg-gray-50 border-gray-100 rounded-xl h-12 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-gray-50 mt-6">
                <PremiumButton onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-green-700 shadow-emerald-500/20 h-14 rounded-2xl">
                  {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                  บันทึกข้อมูลลูกค้า
                </PremiumButton>
                <PremiumButton variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-gray-200 h-14 rounded-2xl">
                  <X className="w-5 h-5 mr-2" /> ยกเลิก
                </PremiumButton>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
            <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">กำลังวิเคราะห์ข้อมูลโครงการ...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {customers.map((customer) => (
            <PremiumCard key={customer.Customer_ID} className="p-0 overflow-hidden group">
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold shadow-2xl shadow-emerald-500/20 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <Building2 size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tighter group-hover:text-emerald-600 transition-colors line-clamp-1">{customer.Customer_Name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">{customer.Customer_ID}</span>
                          <div className="w-1 h-1 rounded-full bg-gray-200" />
                          <span className="text-emerald-500 font-black text-[9px] uppercase tracking-wider italic">PARTNER</span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 flex flex-col gap-2">
                    <PremiumButton 
                        variant="outline" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl"
                        onClick={() => handleOpenDialog(customer)}
                    >
                        <Edit size={16} />
                    </PremiumButton>
                    <PremiumButton 
                        variant="outline" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl text-red-500 border-red-50 hover:bg-red-50"
                        onClick={() => handleDelete(customer.Customer_ID)}
                    >
                        <Trash2 size={16} />
                    </PremiumButton>
                  </div>
                </div>

                <div className="space-y-4 mb-2">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500 flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                            <CreditCard size={14} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tax Identity</p>
                            <p className="text-sm font-black text-gray-700">{customer.Tax_ID || "N/A"}</p>
                        </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                        <div className="flex items-center gap-2 mb-1">
                            <Phone size={12} className="text-emerald-500" />
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Phone</span>
                        </div>
                        <p className="text-xs font-black text-gray-700 line-clamp-1">{customer.Phone || "-"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={12} className="text-emerald-500" />
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Region</span>
                        </div>
                        <p className="text-xs font-black text-gray-700 line-clamp-1">{customer.Branch_ID || "HQ"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-300" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[150px]">{customer.Email || "no-contact@email.com"}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">TOP TIER</span>
                </div>
              </div>
            </PremiumCard>
          ))}
          
          {/* Empty State */}
          {customers.length === 0 && (
            <div className="col-span-full text-center py-24 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
              <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">ไม่พบข้อมูลลูกค้าในคลังข้อมูล</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
