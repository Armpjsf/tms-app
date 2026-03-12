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
import { toast } from "sonner"
import { Customer } from "@/lib/supabase/customers"

interface ExecutiveKPIs {
  revenue: { current: number; previous: number; growth: number; target: number; attainment: number; };
  profit: { current: number; previous: number; growth: number; };
  margin: { current: number | undefined; previous: number | undefined; growth: number; target: number; };
}

export default function CustomersSettingsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null)
  const [formData, setFormData] = useState<Partial<Customer>>({
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
    setKpis(kpiData as unknown as ExecutiveKPIs)
    setLoading(false)
  }, [searchQuery])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const handleOpenDialog = (customer?: Customer) => {
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
    if (!formData.Customer_Name) return toast.warning("กรุณากรอกชื่อลูกค้า")
    setSaving(true)
    try {
      if (editingCustomer) {
        await updateCustomer(formData.Customer_ID!, formData)
        toast.success("แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว")
      } else {
        await createCustomer(formData)
        toast.success("เพิ่มลูกค้าใหม่เรียบร้อยแล้ว")
      }
      setIsDialogOpen(false)
      loadCustomers()
    } catch {
      toast.error("เกิดข้อผิดพลาดในการบันทึก")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบข้อมูลลูกค้า?")) return
    try {
      await deleteCustomer(id)
      toast.success("ลบข้อมูลลูกค้าเรียบร้อยแล้ว")
      loadCustomers()
    } catch {
      toast.error("เกิดข้อผิดพลาดในการลบ")
    }
  }

  const updateForm = (key: string, value: string) => {
    setFormData((prev: Partial<Customer>) => ({ ...prev, [key]: value }))
  }

  return (
    <DashboardLayout>
      {/* Premium Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-slate-950 p-10 rounded-br-[5rem] rounded-tl-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
              <Building2 size={32} />
            </div>
            Customer CRM
          </h1>
          <p className="text-emerald-400 font-black ml-[4.5rem] uppercase tracking-[0.3em] text-[10px]">Strategic Partner Data • Relationship Command</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <ExcelImport 
                trigger={
                    <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900">
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
                { label: "Partner Assets", value: customers.length, icon: Building2, color: "emerald", trend: `${kpis?.revenue?.growth?.toFixed(1) || '0.0'}%` },
                { label: "Quarterly Yield", value: `฿${kpis?.revenue?.current?.toLocaleString() || '0'}`, icon: CreditCard, color: "blue", trend: "High Growth" },
                { label: "Yield Margin", value: `${kpis?.margin?.current?.toFixed(1) || '0.0'}%`, icon: TrendingUp, color: "purple", trend: "Optimal" },
            ].map((stat, idx) => (
                <PremiumCard key={idx} className="p-8 group bg-white/80 backdrop-blur-md border-none shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div className={cn(
                            "p-4 rounded-2xl text-white shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                            stat.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                            stat.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" : "bg-purple-500 shadow-purple-500/20"
                        )}>
                            <stat.icon size={24} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/5 rounded-full border border-black/5">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.trend}</span>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{stat.value}</p>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 text-7xl font-black text-slate-100/50 pointer-events-none select-none">
                        0{idx + 1}
                    </div>
                </PremiumCard>
            ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-12 relative group max-w-2xl">
        <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 p-5 rounded-[2rem] shadow-xl">
          <div className="flex items-center gap-4 px-4">
            <Search className="text-emerald-500" size={24} />
            <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Strategic Partners..."
                className="bg-transparent border-none focus-visible:ring-0 text-xl font-black text-slate-900 placeholder:text-slate-300 tracking-tighter"
            />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl shadow-2xl rounded-[3rem] p-0 overflow-hidden">
            <div className="bg-slate-950 p-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent pointer-events-none" />
                <DialogHeader>
                  <DialogTitle className="text-4xl font-black tracking-tighter flex items-center gap-4">
                    <div className="p-3 bg-emerald-500 rounded-2xl shadow-2xl shadow-emerald-500/20">
                        <Building2 size={28} />
                    </div>
                    {editingCustomer ? "Edit Strategy Partner" : "Onboard New Partner"}
                  </DialogTitle>
                </DialogHeader>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Legal Entity / Company Name</Label>
                <Input
                  value={formData.Customer_Name}
                  onChange={(e) => updateForm("Customer_Name", e.target.value)}
                  placeholder="Enter full legal name..."
                  className="bg-slate-50 border-slate-100 text-xl font-black tracking-tighter rounded-2xl h-16 px-6 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Communication Line</Label>
                  <Input
                    value={formData.Phone || ""}
                    onChange={(e) => updateForm("Phone", e.target.value)}
                    placeholder="+66 XXX-XXXX"
                    className="bg-slate-50 border-slate-100 rounded-xl h-14 font-black px-6"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Digital Identity</Label>
                  <Input
                    value={formData.Email || ""}
                    onChange={(e) => updateForm("Email", e.target.value)}
                    placeholder="partner@domain.com"
                    className="bg-slate-50 border-slate-100 rounded-xl h-14 font-black px-6"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Operational Address</Label>
                <Textarea
                  value={formData.Address || ""}
                  onChange={(e) => updateForm("Address", e.target.value)}
                  placeholder="Specify full operational location..."
                  className="bg-slate-50 border-slate-100 rounded-2xl min-h-[120px] font-bold p-6 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Partner Registry ID</Label>
                  <Input
                    value={formData.Customer_ID || ""}
                    onChange={(e) => updateForm("Customer_ID", e.target.value)}
                    placeholder="System Assigned"
                    className="bg-slate-50 border-slate-100 rounded-xl h-14 font-black px-6"
                    disabled={!!editingCustomer}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Tax Identity Number</Label>
                  <Input
                    value={formData.Tax_ID || ""}
                    onChange={(e) => updateForm("Tax_ID", e.target.value)}
                    placeholder="13-digit identification"
                    className="bg-slate-50 border-slate-100 rounded-xl h-14 font-black px-6"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-10 border-t border-slate-50 mt-10">
                <PremiumButton onClick={handleSave} disabled={saving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 h-16 rounded-2xl">
                  {saving ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Save className="w-6 h-6 mr-3" />}
                  Finalize Registry
                </PremiumButton>
                <PremiumButton variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-slate-200 h-16 rounded-2xl text-slate-400">
                  Cancel
                </PremiumButton>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-950/5 rounded-br-[5rem] rounded-tl-[3rem] border border-dashed border-slate-200">
            <Loader2 className="animate-spin text-emerald-500 mb-6" size={64} />
             <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Syncing Intelligence Matrix...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {customers.map((customer) => (
            <PremiumCard key={customer.Customer_ID} className="p-0 overflow-hidden group border-white/20 bg-white/[0.85] backdrop-blur-xl rounded-br-[5rem] rounded-tl-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] relative hover:shadow-[0_45px_100px_-20px_rgba(16,185,129,0.15)] transition-all duration-700">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[0.5px]" />
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center text-white font-bold shadow-2xl shadow-emerald-500/30 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-transparent" />
                      <Building2 size={28} className="relative z-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors line-clamp-1 duration-500 uppercase">{customer.Customer_Name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{customer.Customer_ID}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          <span className="text-emerald-600 font-black text-[9px] uppercase tracking-[0.3em] italic">TOP TIER</span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-4 group-hover:translate-x-0 flex flex-col gap-3">
                    <PremiumButton 
                        variant="outline" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl border-slate-100"
                        onClick={() => handleOpenDialog(customer)}
                    >
                        <Edit size={16} />
                    </PremiumButton>
                    <PremiumButton 
                        variant="outline" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl text-rose-500 border-rose-50 hover:bg-rose-50"
                        onClick={() => handleDelete(customer.Customer_ID)}
                    >
                        <Trash2 size={16} />
                    </PremiumButton>
                  </div>
                </div>

                <div className="space-y-5 mb-2">
                  <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 flex items-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full" />
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 shadow-inner">
                            <CreditCard size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tax Identity</p>
                            <p className="text-sm font-black text-slate-700 tracking-tight">{customer.Tax_ID || "UNREGISTERED"}</p>
                        </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 blur-xl rounded-full" />
                        <div className="flex items-center gap-2 mb-2">
                            <Phone size={14} className="text-blue-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Phone</span>
                        </div>
                        <p className="text-xs font-black text-slate-700 line-clamp-1 tracking-tight">{customer.Phone || "-"}</p>
                    </div>
                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 blur-xl rounded-full" />
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={14} className="text-indigo-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Region</span>
                        </div>
                        <p className="text-xs font-black text-slate-700 line-clamp-1 tracking-tight">{customer.Branch_ID || "HQ"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50/30 border-t border-slate-100/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                        <Mail size={12} className="text-slate-400" />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px] italic">{customer.Email || "registry-pending@tms.com"}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                    <TrendingUp size={12} className="animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest">ACTIVE</span>
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
