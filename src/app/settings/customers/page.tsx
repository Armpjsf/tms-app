"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
    ShieldCheck,
    ArrowLeft
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ExcelImport } from "@/components/ui/excel-import"
import { createBulkCustomers, getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/supabase/customers"
import { getExecutiveKPIs } from "@/lib/supabase/analytics"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Customer } from "@/lib/supabase/customers"
import { Tabs, TabsContent, List as TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomerFuelMatrix } from "@/components/settings/customer-fuel-matrix"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ExecutiveKPIs {
  revenue: { current: number; previous: number; growth: number; target: number; attainment: number; };
  profit: { current: number; previous: number; growth: number; };
  margin: { current: number | undefined; previous: number | undefined; growth: number; target: number; };
}

export default function CustomersSettingsPage() {
  const { t } = useLanguage()
  const fuelMatrixRef = useRef<any>(null)
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
    Credit_Term: 30,
    Price_Per_Unit: 0,
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
        Credit_Term: 30,
        Price_Per_Unit: 0,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.Customer_Name) return toast.warning(t('common.error'))
    setSaving(true)
    try {
      // 1. Save Fuel Matrix logic (via ref)
      if (fuelMatrixRef.current) {
          const matrixResult = await fuelMatrixRef.current.handleSave()
          if (!matrixResult?.success) {
              setSaving(false)
              // The toast is already handled inside CustomerFuelMatrix
              return 
          }
      }

      // 2. Save Main Customer Data
      if (editingCustomer) {
        const result = await updateCustomer(formData.Customer_ID!, formData)
        if (!result.success) throw new Error(result.error?.message || 'Update failed')
        toast.success(t('common.toast.success_edit'))
      } else {
        const result = await createCustomer(formData)
        if (!result.success) throw new Error(result.error?.message || 'Create failed')
        toast.success(t('common.toast.success_save'))
      }
      setIsDialogOpen(false)
      loadCustomers()
    } catch (e: any) {
      console.error('Save error:', e)
      toast.error(t('common.toast.error_save') + ": " + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.toast.confirm_delete'))) return
    try {
      await deleteCustomer(id)
      toast.success(t('common.toast.success_delete'))
      loadCustomers()
    } catch {
      toast.error(t('common.toast.error_delete'))
    }
  }

  const updateForm = (key: string, value: any) => {
    setFormData((prev: Partial<Customer>) => ({ ...prev, [key]: value }))
  }

  return (
    <DashboardLayout>
      {/* Tactical CRM Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16 bg-background/60 backdrop-blur-3xl p-12 rounded-[4rem] border border-border/5 shadow-2xl relative group ring-1 ring-border/5 hover:ring-primary/20 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-8">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.1em] text-base font-bold group/back italic">
                <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                ย้อนกลับ
            </button>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl shadow-lg">
                    <Users className="text-primary" size={20} />
                </div>
                <h2 className="text-base font-bold font-black text-primary uppercase tracking-tight">{t('settings_pages.customers.title')}</h2>
            </div>
            <h1 className="text-6xl font-black text-foreground tracking-tighter flex items-center gap-5 uppercase premium-text-gradient">
                {t('settings_pages.customers.title')}
            </h1>
            <p className="text-muted-foreground font-bold text-xl tracking-wide opacity-80 uppercase leading-relaxed">{t('settings_pages.customers.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
            <ExcelImport 
                trigger={
                    <PremiumButton variant="outline" className="h-14 px-8 rounded-2xl border-border/5 bg-muted/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all" >
                        <FileSpreadsheet size={20} className="mr-3 opacity-50" /> 
                        {t('settings_pages.customers.bulk_import')}
                    </PremiumButton>
                }
                title={t('settings_pages.customers.import_title')}
                onImport={createBulkCustomers}
                templateData={[{
                    Customer_ID: "CUST-001",
                    Customer_Name: "บริษัท ตัวอย่าง จำกัด",
                    Tax_ID: "1234567890123",
                    Phone: "02-123-4567",
                    Address: "123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
                    Email: "contact@example.com",
                    Line_User_ID: "@example_line",
                    Credit_Term: 30,
                    Price_Per_Unit: 1500.00
                }]}
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
                  "p-8 rounded-[3rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.03] bg-background/40",
                  stat.border
              )}>
                    <div className="flex items-center justify-between mb-8">
                        <div className={cn(
                            "p-4 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6",
                            stat.bg, stat.color
                        )}>
                            <stat.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full border border-border/5">
                             <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-normal italic">{stat.trend}</span>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-muted-foreground font-black text-base font-bold uppercase tracking-tight mb-2">{stat.label}</p>
                        <p className="text-4xl font-black text-foreground tracking-tighter leading-none">{stat.value}</p>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Global Search Interface */}
      <div className="mb-12 relative group max-w-2xl">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary blur-3xl opacity-20 pointer-events-none" />
        <div className="relative glass-panel rounded-3xl p-1 border-border/5">
            <div className="flex items-center gap-4 px-6">
                <Search className="text-primary opacity-50" size={24} />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('settings_pages.customers.search_placeholder')}
                    className="bg-transparent border-none text-2xl font-black text-foreground px-4 h-20 placeholder:text-muted-foreground tracking-tighter uppercase focus-visible:ring-0"
                />
            </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-background border border-border/5 text-foreground max-w-6xl max-h-[90vh] shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[3rem] sm:rounded-[4rem] p-0 overflow-hidden ring-1 ring-white/10 flex flex-col">
            <div className="bg-card p-6 sm:p-10 text-foreground relative overflow-hidden border-b border-border/5 shrink-0">
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

            <div className="p-6 sm:p-10 space-y-6 custom-scrollbar flex-1 min-h-0 overflow-y-auto">
              <Tabs defaultValue="info" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/5 h-auto">
                        <TabsTrigger value="info" className="px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            ข้อมูลทั่วไป
                        </TabsTrigger>
                        <TabsTrigger value="rates" disabled={!editingCustomer} className="px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                            เรทน้ำมัน (Fuel Matrix)
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-500">
                  <div className="space-y-4">
                    <Label className="text-base font-bold font-black uppercase tracking-tight text-muted-foreground ml-2">{t('settings_pages.customers.dialog.name')}</Label>
                    <div className="glass-panel p-1 rounded-2xl border-border/5">
                        <Input
                        value={formData.Customer_Name}
                        onChange={(e) => updateForm("Customer_Name", e.target.value)}
                        placeholder={t('settings_pages.customers.dialog.name_placeholder')}
                        className="bg-transparent border-none text-2xl font-black tracking-tighter rounded-xl h-16 px-8 focus:bg-muted/50 transition-all text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-base font-bold font-black uppercase tracking-tight text-muted-foreground ml-2">{t('settings_pages.customers.dialog.phone')}</Label>
                      <Input
                        value={formData.Phone || ""}
                        onChange={(e) => updateForm("Phone", e.target.value)}
                        placeholder="+66 XXX-XXXX"
                        className="bg-muted/50 border-border/5 rounded-2xl h-14 font-black px-8 text-foreground focus:ring-primary/40 focus:bg-secondary/50 transition-all uppercase tracking-normal text-xl"
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-base font-bold font-black uppercase tracking-tight text-muted-foreground ml-2">{t('settings_pages.customers.dialog.email')}</Label>
                      <Input
                        value={formData.Email || ""}
                        onChange={(e) => updateForm("Email", e.target.value)}
                        placeholder="partner@logispro.matrix"
                        className="bg-muted/50 border-border/5 rounded-2xl h-14 font-black px-8 text-foreground focus:ring-primary/40 focus:bg-secondary/50 transition-all uppercase tracking-normal text-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-bold font-black uppercase tracking-tight text-muted-foreground ml-2">{t('settings_pages.customers.dialog.address')}</Label>
                    <Textarea
                      value={formData.Address || ""}
                      onChange={(e) => updateForm("Address", e.target.value)}
                      placeholder="SPECIFY FULL OPERATIONAL COORDINATES..."
                      className="bg-muted/50 border-border/5 rounded-[2rem] min-h-[140px] font-bold p-8 text-foreground focus:ring-primary/40 focus:bg-secondary/50 transition-all uppercase tracking-wide leading-relaxed text-xl placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-base font-bold font-black uppercase tracking-tight text-muted-foreground ml-2">{t('settings_pages.customers.dialog.branch')}</Label>
                      <Input
                        value={formData.Customer_ID || ""}
                        onChange={(e) => updateForm("Customer_ID", e.target.value)}
                        placeholder="SYSTEM GENERATED"
                        className="bg-muted/50 border-border/5 rounded-2xl h-14 font-black px-8 text-foreground focus:ring-primary/40 focus:bg-secondary/50 transition-all uppercase tracking-normal text-xl"
                        disabled={!!editingCustomer}
                      />
                    </div>
                     <div className="space-y-4">
                       <Label className="text-base font-bold font-black uppercase tracking-tight text-muted-foreground ml-2">{t('settings_pages.customers.dialog.tax_id')}</Label>
                      <Input
                        value={formData.Tax_ID || ""}
                        onChange={(e) => updateForm("Tax_ID", e.target.value)}
                        placeholder="13-DIGIT VERIFIER"
                        className="bg-muted/50 border-border/5 rounded-2xl h-14 font-black px-8 text-foreground focus:ring-primary/40 focus:bg-secondary/50 transition-all uppercase tracking-normal text-xl"
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
                            className="bg-transparent border-none text-foreground font-black rounded-xl h-14 px-8 flex-1 focus:bg-primary/10 tracking-normal"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-accent ml-2 flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                          Credit Term (Days)
                      </Label>
                      <div className="glass-panel p-1 rounded-2xl border-accent/20 bg-accent/5">
                          <Input
                              type="number"
                              value={formData.Credit_Term || 30}
                              onChange={(e) => updateForm("Credit_Term", parseInt(e.target.value) || 0)}
                              placeholder="Enter Credit Term in Days..."
                              className="bg-transparent border-none text-foreground font-black rounded-xl h-14 px-8 flex-1 focus:bg-accent/10 tracking-normal"
                          />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-emerald-500 ml-2 flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Price Per Unit (฿)
                      </Label>
                      <div className="glass-panel p-1 rounded-2xl border-emerald-500/20 bg-emerald-500/5">
                          <Input
                              type="number"
                              step="0.01"
                              value={formData.Price_Per_Unit || 0}
                              onChange={(e) => updateForm("Price_Per_Unit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="bg-transparent border-none text-foreground font-black rounded-xl h-14 px-8 flex-1 focus:bg-emerald-500/10 tracking-normal"
                          />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rates" className="animate-in fade-in slide-in-from-right-2 duration-500">
                    {editingCustomer && (
                        <CustomerFuelMatrix 
                            ref={fuelMatrixRef}
                            customerId={editingCustomer.Customer_ID} 
                            customerName={editingCustomer.Customer_Name} 
                        />
                    )}
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="p-6 sm:p-10 border-t border-border/5 bg-black/40 gap-4 sm:gap-6 flex-row shrink-0">
                <PremiumButton variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-none h-14 sm:h-16 px-6 sm:px-10 rounded-[1.2rem] sm:rounded-[1.5rem] border-border/5 text-muted-foreground hover:text-foreground uppercase tracking-normal text-base sm:text-lg font-bold font-black">{t('settings_pages.customers.dialog.abort')}</PremiumButton>
                <PremiumButton onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none h-14 sm:h-16 px-8 sm:px-12 rounded-[1.5rem] sm:rounded-[2rem] gap-3 sm:gap-4 shadow-[0_20px_50px_rgba(255,30,133,0.3)] sm:min-w-[200px] text-lg sm:text-xl tracking-normal bg-primary text-foreground border-0">
                    {saving ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Save className="w-5 h-5 sm:w-6 sm:h-6" />}
                    {t('settings_pages.customers.dialog.execute')}
                </PremiumButton>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-[4rem] border-border/5 group">
             <div className="relative">
                <Loader2 className="animate-spin text-primary opacity-40" size={80} strokeWidth={1} />
                <Activity className="absolute inset-0 m-auto text-primary animate-pulse" size={32} />
             </div>
             <p className="mt-10 text-muted-foreground font-black uppercase tracking-widest text-base font-bold animate-pulse">{t('settings_pages.customers.status.syncing')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {customers.map((customer) => (
            <div key={customer.Customer_ID} className="p-0 overflow-hidden group border border-border/5 bg-background/40 backdrop-blur-2xl rounded-[3.5rem] shadow-2xl relative hover:shadow-[0_45px_100px_-20px_rgba(255,30,133,0.1)] transition-all duration-700 hover:ring-1 hover:ring-primary/30">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="p-10">
                <div className="flex items-start justify-between mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-muted/50 border border-border/5 flex items-center justify-center text-foreground font-bold group-hover:bg-primary transition-all duration-700 relative overflow-hidden shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
                      <Building2 size={28} className="relative z-10" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-foreground tracking-tighter group-hover:text-primary transition-colors line-clamp-1 duration-500 uppercase font-display">{customer.Customer_Name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                          <span className="text-muted-foreground font-black text-base font-bold uppercase tracking-wide">{customer.Customer_ID}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                          <span className="text-primary font-black text-base font-bold uppercase tracking-wide italic opacity-70">{t('settings_pages.customers.status.strategic')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-3 group-hover:translate-y-0 flex flex-col gap-3">
                    <button 
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/50 border border-border/10 text-muted-foreground hover:bg-primary hover:text-foreground transition-all shadow-lg"
                        onClick={() => handleOpenDialog(customer)}
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/50 border border-border/10 text-rose-800 hover:bg-rose-500 hover:text-foreground transition-all shadow-lg"
                        onClick={() => handleDelete(customer.Customer_ID)}
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6 mb-4">
                  <div className="p-6 bg-muted/30 rounded-3xl border border-border/5 group-hover:bg-muted/50 transition-all duration-700 flex items-center gap-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 blur-3xl rounded-full" />
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner ring-1 ring-primary/20">
                            <ShieldCheck size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-wide mb-1">{t('settings_pages.customers.dialog.tax_id')}</p>
                            <p className="text-xl font-black text-foreground tracking-tight">{customer.Tax_ID || t('settings_pages.customers.status.unverified')}</p>
                        </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-6 bg-muted/30 rounded-3xl border border-border/5 group-hover:bg-muted/50 transition-all duration-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-accent/5 blur-2xl rounded-full" />
                        <div className="flex items-center gap-2 mb-3">
                            <Phone size={14} className="text-accent" />
                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-normal leading-none">{t('settings_pages.customers.dialog.phone')}</span>
                        </div>
                        <p className="text-base font-bold font-black text-foreground truncate tracking-normal">{customer.Phone || t('settings_pages.customers.status.offline')}</p>
                    </div>
                    <div className="p-6 bg-muted/30 rounded-3xl border border-border/5 group-hover:bg-muted/50 transition-all duration-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-accent/5 blur-2xl rounded-full" />
                        <div className="flex items-center gap-2 mb-3">
                            <Zap size={14} className="text-accent" />
                            <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-normal leading-none">Credit Term</span>
                        </div>
                        <p className="text-base font-bold font-black text-foreground truncate tracking-normal">{customer.Credit_Term || 30} Days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* High-End Tactical Footer */}
              <div className="px-10 py-6 bg-muted/30 border-t border-border/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted/50 rounded-xl border border-border/5">
                        <Mail size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-normal truncate max-w-[160px] italic group-hover:text-muted-foreground transition-colors">{customer.Email || "registry-pending@logispro.io"}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-2xl shadow-lg shadow-primary/5 ring-1 ring-primary/30">
                    <Zap size={14} className="animate-pulse" />
                    <span className="text-base font-bold font-black tracking-normal">
                        {customer.Price_Per_Unit && customer.Price_Per_Unit > 0 ? `฿${customer.Price_Per_Unit}/UNIT` : t('settings_pages.customers.status.connected')}
                    </span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Enhanced Empty State */}
          {customers.length === 0 && (
            <div className="col-span-full text-center py-40 glass-panel rounded-[4rem] border-dashed border-border/5 group">
              <Activity className="w-20 h-20 text-muted-foreground mx-auto mb-8 opacity-20 group-hover:scale-110 transition-transform duration-1000" />
              <p className="text-muted-foreground font-black uppercase tracking-widest text-base font-bold">{t('settings_pages.customers.status.empty')}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-20 text-center mb-24">
        <div className="inline-flex items-center gap-4 px-8 py-3 glass-panel rounded-full text-base font-bold font-black text-muted-foreground uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
            <Activity size={14} className="text-primary" /> {t('settings_pages.customers.status.footer')}
        </div>
      </div>
    </DashboardLayout>
  )
}
