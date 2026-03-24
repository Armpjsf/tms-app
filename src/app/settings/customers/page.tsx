"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
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
    CreditCard,
    TrendingUp,
    Zap,
    Users,
    Activity,
    ShieldCheck
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
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Customer } from "@/lib/supabase/customers"

interface ExecutiveKPIs {
  revenue: { current: number; previous: number; growth: number; target: number; attainment: number; };
  profit: { current: number; previous: number; growth: number; };
  margin: { current: number | undefined; previous: number | undefined; growth: number; target: number; };
}

export default function CustomersSettingsPage() {
  const { t } = useLanguage()
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
    Line_User_ID: "",
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
        Line_User_ID: "",
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
      {/* Tactical CRM Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-[#0a0518]/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/5 shadow-2xl relative group ring-1 ring-white/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <Users className="text-primary" size={20} />
                </div>
                <h2 className="text-base font-bold font-black text-primary uppercase tracking-[0.1em]">Strategic Partner Ecosystem</h2>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {t('settings_pages.customers.title')}
            </h1>
            <p className="text-slate-500 font-bold text-xl tracking-wide opacity-80 uppercase tracking-widest leading-relaxed">{t('settings_pages.customers.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <ExcelImport 
                trigger={
                    <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all" >
                        <FileSpreadsheet size={20} className="mr-3 opacity-50" /> 
                        {t('settings_pages.customers.bulk_import')}
                    </PremiumButton>
                }
                title={t('settings_pages.customers.import_title')}
                onImport={createBulkCustomers}
                templateFilename="logispro_client_template.xlsx"
            />
            <PremiumButton onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-2xl shadow-xl shadow-primary/20">
              <Plus size={24} className="mr-3" strokeWidth={3} />
              {t('settings_pages.customers.add_customer')}
            </PremiumButton>
        </div>
      </div>

      {/* Analytics Matrix */}
      {!loading && kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
                { label: t('settings_pages.customers.stats.count'), value: customers.length, icon: Building2, color: "text-primary", bg: "bg-primary/20", border: "border-primary/20", trend: `+${kpis?.revenue?.growth?.toFixed(1) || '0.0'}%` },
                { label: t('settings_pages.customers.stats.yield'), value: `฿${kpis?.revenue?.current?.toLocaleString() || '0'}`, icon: CreditCard, color: "text-accent", bg: "bg-accent/20", border: "border-accent/20", trend: "High Performance" },
                { label: t('settings_pages.customers.stats.margin'), value: `${kpis?.margin?.current?.toFixed(1) || '0.0'}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", border: "border-primary/10", trend: "OPTIMIZED" },
            ].map((stat, idx) => (
              <div key={idx} className={cn(
                  "p-8 rounded-[3rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-[#0a0518]/40",
                  stat.border
              )}>
                    <div className="flex items-center justify-between mb-8">
                        <div className={cn(
                            "p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6",
                            stat.bg, stat.color
                        )}>
                            <stat.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                             <span className="text-base font-bold font-black text-slate-500 uppercase tracking-widest italic">{stat.trend}</span>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-500 font-black text-base font-bold uppercase tracking-[0.1em] mb-2">{stat.label}</p>
                        <p className="text-4xl font-black text-white tracking-tighter leading-none">{stat.value}</p>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Global Search Interface */}
      <div className="mb-12 relative group max-w-2xl">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary blur-3xl opacity-20 pointer-events-none" />
        <div className="relative glass-panel rounded-3xl p-1 border-white/5">
            <div className="flex items-center gap-4 px-6">
                <Search className="text-primary opacity-50" size={24} />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('settings_pages.customers.search_placeholder')}
                    className="bg-transparent border-none text-2xl font-black text-white px-4 h-20 placeholder:text-slate-700 tracking-tighter uppercase focus-visible:ring-0"
                />
            </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-[#0a0518] border border-white/5 text-white max-w-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[4rem] p-0 overflow-hidden ring-1 ring-white/10">
            <div className="bg-[#0c061d] p-12 text-white relative overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <DialogHeader>
                  <DialogTitle className="text-5xl font-black tracking-tighter flex items-center gap-6 uppercase premium-text-gradient">
                    <div className="p-3 bg-primary/20 rounded-2xl shadow-xl ring-1 ring-primary/30">
                        <Building2 size={32} className="text-primary" strokeWidth={2.5} />
                    </div>
                    {editingCustomer ? t('settings_pages.customers.dialog.title_edit') : t('settings_pages.customers.dialog.title_add')}
                  </DialogTitle>
                </DialogHeader>
            </div>

            <div className="p-12 space-y-10 custom-scrollbar max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-slate-500 ml-2">{t('settings_pages.customers.dialog.name')}</Label>
                <div className="glass-panel p-1 rounded-2xl border-white/5">
                    <Input
                    value={formData.Customer_Name}
                    onChange={(e) => updateForm("Customer_Name", e.target.value)}
                    placeholder={t('settings_pages.customers.dialog.name_placeholder')}
                    className="bg-transparent border-none text-2xl font-black tracking-tighter rounded-xl h-20 px-8 focus:bg-white/5 transition-all text-white placeholder:text-slate-800"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-slate-500 ml-2">{t('settings_pages.customers.dialog.phone')}</Label>
                  <Input
                    value={formData.Phone || ""}
                    onChange={(e) => updateForm("Phone", e.target.value)}
                    placeholder="+66 XXX-XXXX"
                    className="bg-white/5 border-white/5 rounded-2xl h-16 font-black px-8 text-white focus:ring-primary/40 focus:bg-white/10 transition-all uppercase tracking-widest text-xl"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-slate-500 ml-2">{t('settings_pages.customers.dialog.email')}</Label>
                  <Input
                    value={formData.Email || ""}
                    onChange={(e) => updateForm("Email", e.target.value)}
                    placeholder="partner@logispro.matrix"
                    className="bg-white/5 border-white/5 rounded-2xl h-16 font-black px-8 text-white focus:ring-primary/40 focus:bg-white/10 transition-all uppercase tracking-widest text-xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-slate-500 ml-2">{t('settings_pages.customers.dialog.address')}</Label>
                <Textarea
                  value={formData.Address || ""}
                  onChange={(e) => updateForm("Address", e.target.value)}
                  placeholder="SPECIFY FULL OPERATIONAL COORDINATES..."
                  className="bg-white/5 border-white/5 rounded-[2rem] min-h-[140px] font-bold p-8 text-white focus:ring-primary/40 focus:bg-white/10 transition-all uppercase tracking-wide leading-relaxed text-xl placeholder:text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-slate-500 ml-2">{t('settings_pages.customers.dialog.branch')}</Label>
                  <Input
                    value={formData.Customer_ID || ""}
                    onChange={(e) => updateForm("Customer_ID", e.target.value)}
                    placeholder="SYSTEM GENERATED"
                    className="bg-white/5 border-white/5 rounded-2xl h-16 font-black px-8 text-white focus:ring-primary/40 focus:bg-white/10 transition-all uppercase tracking-widest text-xl"
                    disabled={!!editingCustomer}
                  />
                </div>
                 <div className="space-y-4">
                   <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-slate-500 ml-2">{t('settings_pages.customers.dialog.tax_id')}</Label>
                  <Input
                    value={formData.Tax_ID || ""}
                    onChange={(e) => updateForm("Tax_ID", e.target.value)}
                    placeholder="13-DIGIT VERIFIER"
                    className="bg-white/5 border-white/5 rounded-2xl h-16 font-black px-8 text-white focus:ring-primary/40 focus:bg-white/10 transition-all uppercase tracking-widest text-xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-primary ml-2 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {t('settings_pages.customers.dialog.line_id')}
                </Label>
                <div className="glass-panel p-1 rounded-2xl border-primary/20 bg-primary/5">
                    <Input
                        value={formData.Line_User_ID || ""}
                        onChange={(e) => updateForm("Line_User_ID", e.target.value)}
                        placeholder="ENTER LINE U-VECTOR..."
                        className="bg-transparent border-none text-white font-black rounded-xl h-16 px-8 flex-1 focus:bg-primary/10 tracking-widest"
                    />
                </div>
              </div>

              <div className="flex gap-6 pt-10 border-t border-white/5 mt-12 mb-8">
                <PremiumButton onClick={handleSave} disabled={saving} className="flex-[2] bg-primary hover:bg-primary/80 shadow-primary/20 h-20 rounded-3xl text-lg font-black tracking-widest">
                  {saving ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Save className="w-6 h-6 mr-4" strokeWidth={3} />}
                  {t('settings_pages.customers.dialog.execute')}
                </PremiumButton>
                <PremiumButton variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-white/5 h-20 rounded-3xl text-slate-500 hover:text-white hover:bg-white/5 transition-all uppercase font-black tracking-widest">
                  {t('settings_pages.customers.dialog.abort')}
                </PremiumButton>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-[4rem] border-white/5 group">
             <div className="relative">
                <Loader2 className="animate-spin text-primary opacity-40" size={80} strokeWidth={1} />
                <Activity className="absolute inset-0 m-auto text-primary animate-pulse" size={32} />
             </div>
             <p className="mt-10 text-slate-700 font-black uppercase tracking-[0.6em] text-base font-bold animate-pulse">{t('settings_pages.customers.status.syncing')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {customers.map((customer) => (
            <div key={customer.Customer_ID} className="p-0 overflow-hidden group border border-white/5 bg-[#0a0518]/40 backdrop-blur-2xl rounded-[3.5rem] shadow-2xl relative hover:shadow-[0_45px_100px_-20px_rgba(255,30,133,0.1)] transition-all duration-700 hover:ring-1 hover:ring-primary/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="p-10">
                <div className="flex items-start justify-between mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-white font-bold group-hover:bg-primary transition-all duration-700 relative overflow-hidden shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
                      <Building2 size={28} className="relative z-10" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-primary transition-colors line-clamp-1 duration-500 uppercase font-display">{customer.Customer_Name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                          <span className="text-slate-500 font-black text-base font-bold uppercase tracking-[0.3em]">{customer.Customer_ID}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                          <span className="text-primary font-black text-base font-bold uppercase tracking-[0.4em] italic opacity-70">{t('settings_pages.customers.status.strategic')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-3 group-hover:translate-y-0 flex flex-col gap-3">
                    <button 
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-primary hover:text-white transition-all shadow-lg"
                        onClick={() => handleOpenDialog(customer)}
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-rose-800 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                        onClick={() => handleDelete(customer.Customer_ID)}
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6 mb-4">
                  <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 group-hover:bg-white/[0.04] transition-all duration-700 flex items-center gap-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 blur-3xl rounded-full" />
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner ring-1 ring-primary/20">
                            <ShieldCheck size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-base font-bold font-black text-slate-600 uppercase tracking-[0.3em] mb-1">{t('settings_pages.customers.dialog.tax_id')}</p>
                            <p className="text-xl font-black text-slate-300 tracking-tight">{customer.Tax_ID || t('settings_pages.customers.status.unverified')}</p>
                        </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 group-hover:bg-white/[0.04] transition-all duration-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-accent/5 blur-2xl rounded-full" />
                        <div className="flex items-center gap-2 mb-3">
                            <Phone size={14} className="text-accent" />
                            <span className="text-base font-bold font-black text-slate-600 uppercase tracking-widest leading-none">{t('settings_pages.customers.dialog.phone')}</span>
                        </div>
                        <p className="text-base font-bold font-black text-slate-300 truncate tracking-widest">{customer.Phone || t('settings_pages.customers.status.offline')}</p>
                    </div>
                    <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 group-hover:bg-white/[0.04] transition-all duration-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 blur-2xl rounded-full" />
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin size={14} className="text-primary" />
                            <span className="text-base font-bold font-black text-slate-600 uppercase tracking-widest leading-none">{t('settings_pages.customers.dialog.branch')}</span>
                        </div>
                        <p className="text-base font-bold font-black text-slate-300 truncate tracking-widest">{customer.Branch_ID || "Global"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* High-End Tactical Footer */}
              <div className="px-10 py-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                        <Mail size={12} className="text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-base font-bold font-black text-slate-600 uppercase tracking-widest truncate max-w-[160px] italic group-hover:text-slate-400 transition-colors">{customer.Email || "registry-pending@logispro.io"}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-2xl shadow-lg shadow-primary/5 ring-1 ring-primary/30">
                    <Zap size={14} className="animate-pulse" />
                    <span className="text-base font-bold font-black tracking-[0.2em]">{t('settings_pages.customers.status.connected')}</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Enhanced Empty State */}
          {customers.length === 0 && (
            <div className="col-span-full text-center py-40 glass-panel rounded-[4rem] border-dashed border-white/5 group">
              <Activity className="w-20 h-20 text-slate-800 mx-auto mb-8 opacity-20 group-hover:scale-110 transition-transform duration-1000" />
              <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-base font-bold">{t('settings_pages.customers.status.empty')}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-base font-bold font-black text-slate-700 uppercase tracking-[0.6em] opacity-40 hover:opacity-100 transition-opacity">
            <Activity size={14} className="text-primary" /> {t('settings_pages.customers.status.footer')}
        </div>
      </div>
    </DashboardLayout>
  )
}

