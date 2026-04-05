"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Plus, 
    Edit, 
    Trash2, 
    Loader2, 
    ArrowLeft, 
    Truck, 
    Activity, 
    Zap, 
    Target,
    Settings2,
    Database,
    Save,
    FileSpreadsheet
} from "lucide-react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"
import { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType, VehicleType, createBulkVehicleTypes } from "@/lib/actions/vehicle-type-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"
import { ExcelImport } from "@/components/ui/excel-import"

export default function VehicleTypesPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [types, setTypes] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentType, setCurrentType] = useState<VehicleType | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    type_name: '',
    description: '',
    active_status: 'Active'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Data
  const fetchTypes = useCallback(async () => {
    setLoading(true)
    const data = await getVehicleTypes()
    setTypes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  // Handlers
  const handleOpenCreate = () => {
    setCurrentType(null)
    setFormData({ type_name: '', description: '', active_status: 'Active' })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (type: VehicleType) => {
    setCurrentType(type)
    setFormData({
      type_name: type.type_name,
      description: type.description || '',
      active_status: type.active_status
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.type_name.trim()) return toast.warning(t('settings_pages.vehicle_types.toasts.required'))
    
    setIsSubmitting(true)
    try {
      if (currentType) {
        const res = await updateVehicleType(currentType.type_id, formData)
        if (res.success) {
          toast.success(t('settings_pages.vehicle_types.toasts.sync_success'))
          setIsDialogOpen(false)
          fetchTypes()
        } else {
            toast.error(t('settings_pages.vehicle_types.toasts.handshake_failed') + res.message)
        }
      } else {
        const res = await createVehicleType(formData)
        if (res.success) {
            toast.success(t('settings_pages.vehicle_types.toasts.deploy_success'))
            setIsDialogOpen(false)
            fetchTypes()
        } else {
            toast.error(t('settings_pages.vehicle_types.toasts.handshake_failed') + res.message)
        }
      }
    } catch {
        toast.error(t('settings_pages.vehicle_types.toasts.transmission_error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('settings_pages.vehicle_types.toasts.confirm_delete'))) return

    const res = await deleteVehicleType(id)
    if (res.success) {
        toast.success(t('settings_pages.vehicle_types.toasts.delete_success'))
        fetchTypes()
    } else {
        toast.error(t('settings_pages.vehicle_types.toasts.handshake_failed') + res.message)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.1em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    {t('settings_pages.vehicle_types.ui.command_control')}
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Truck size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">
                            {t('settings_pages.vehicle_types.title')}
                        </h1>
                        <p className="text-base font-bold font-black text-primary uppercase tracking-[0.2em] mt-2 opacity-80 italic">{t('settings_pages.vehicle_types.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-muted/50 border border-border/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('common.tactical.system_ready')}</span>
                </div>
                <div className="flex gap-4">
                    <ExcelImport 
                        trigger={
                            <PremiumButton variant="outline" className="h-16 px-10 rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xl gap-3">
                                <FileSpreadsheet size={24} strokeWidth={3} />
                                {t('common.tactical.bulk_import') || 'Import'}
                            </PremiumButton>
                        }
                        title={t('settings_pages.vehicle_types.import_title') || 'Import Vehicle Types'}
                        onImport={createBulkVehicleTypes}
                        templateData={[{
                            type_name: "4-Wheel",
                            description: "4-Wheel Truck (1.5 Ton)",
                            active_status: "Active"
                        }]}
                        templateFilename="logispro_vehicle_types_template.xlsx"
                    />
                    <PremiumButton onClick={handleOpenCreate} className="h-16 px-12 rounded-2xl bg-primary text-foreground border-0 shadow-[0_20px_50px_rgba(255,30,133,0.3)] gap-4 text-xl tracking-widest">
                        <Plus size={24} strokeWidth={3} />
                        {t('settings_pages.vehicle_types.add_type')}
                    </PremiumButton>
                </div>
            </div>
        </div>

        {/* Global Registry Table */}
        <div className="grid grid-cols-1 gap-8">
            <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/matrix">
                <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
                    <h3 className="text-xl font-black text-foreground tracking-widest uppercase italic flex items-center gap-3">
                        <Database size={20} className="text-primary" />
                        {t('settings_pages.vehicle_types.specification_nodes')}
                    </h3>
                    <div className="px-5 py-1.5 rounded-xl bg-primary/10 text-base font-bold font-black text-primary uppercase tracking-[0.1em] border border-primary/20 italic">
                        {t('settings_pages.vehicle_types.total_classes')}: {types.length}
                    </div>
                </div>

                <div className="relative overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/5">
                                <th className="px-12 py-8 text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground italic">{t('settings_pages.vehicle_types.table.designation')}</th>
                                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground italic">{t('settings_pages.vehicle_types.table.parameters')}</th>
                                <th className="px-8 py-8 text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground italic">{t('settings_pages.vehicle_types.table.status')}</th>
                                <th className="px-12 py-8 text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground text-right italic">{t('settings_pages.vehicle_types.table.command')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-40">
                                        <div className="relative inline-block">
                                            <Loader2 className="w-16 h-16 text-primary animate-spin opacity-20" strokeWidth={1} />
                                            <Activity className="absolute inset-0 m-auto text-primary animate-pulse" size={24} />
                                        </div>
                                        <p className="mt-8 text-muted-foreground font-black uppercase tracking-[0.6em] text-base font-bold">{t('settings_pages.vehicle_types.loading')}</p>
                                    </td>
                                </tr>
                            ) : types.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-40 text-muted-foreground font-black uppercase tracking-[0.5em] text-lg font-bold">
                                        {t('settings_pages.vehicle_types.empty')}
                                    </td>
                                </tr>
                            ) : (
                                types.map((type) => (
                                    <tr key={type.type_id} className="group/row hover:bg-primary/[0.03] transition-all duration-500">
                                        <td className="px-12 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border/5 flex items-center justify-center text-primary group-hover/row:bg-primary group-hover/row:text-foreground transition-all duration-500 shadow-xl group-hover/row:shadow-[0_0_30px_rgba(255,30,133,0.3)] group-hover/row:-rotate-3">
                                                    <Truck size={22} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <span className="font-black text-foreground text-xl tracking-tighter group-hover/row:text-primary transition-colors font-display uppercase italic">{type.type_name}</span>
                                                    <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.3em] mt-1 italic">{t('common.tactical.v_matrix_id')}: {type.type_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="max-w-xs">
                                                <p className="text-muted-foreground font-bold text-xl tracking-tight leading-relaxed uppercase italic">
                                                    {type.description || t('common.tactical.no_intel')}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className={cn(
                                                "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-[1.5rem] text-base font-bold font-black uppercase tracking-widest border shadow-xl transition-all duration-500 group-hover/row:scale-105 italic",
                                                type.active_status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor]", type.active_status === 'Active' ? "bg-current animate-pulse" : "bg-rose-500")} />
                                                {type.active_status === 'Active' ? t('common.tactical.active') : t('common.tactical.inactive')}
                                            </div>
                                        </td>
                                        <td className="px-12 py-8 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-all duration-500 translate-x-4 group-hover/row:translate-x-0">
                                                <button onClick={() => handleOpenEdit(type)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-muted/50 border border-border/5 text-muted-foreground hover:text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all shadow-xl">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(type.type_id)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-muted/50 border border-border/5 text-rose-800 hover:bg-rose-500 hover:text-foreground transition-all shadow-xl">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-8 border-t border-border/5 bg-muted/30 flex items-center justify-between">
                    <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] italic">{t('common.tactical.fleet_spec_node')}</p>
                    <Zap size={16} className="text-primary/20" />
                </div>
            </PremiumCard>
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-primary/5 border-2 border-primary/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-primary/20 text-primary border-2 border-primary/30 shadow-2xl animate-pulse">
                <Target size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">{t('settings_pages.vehicle_types.ui.advisory_title')}</p>
                <p className="text-xl font-bold text-muted-foreground leading-relaxed uppercase tracking-wider italic">
                    {t('settings_pages.vehicle_types.ui.advisory_desc')}
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-border/10 text-foreground gap-3 uppercase font-black text-base font-bold tracking-[0.3em] ml-auto italic">
                <Activity size={18} /> {t('settings_pages.vehicle_types.ui.view_capacity')}
            </PremiumButton>
        </div>

        {/* Tactical Config Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-background border border-border/5 text-foreground max-w-xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[4rem] p-0 overflow-hidden ring-1 ring-white/10">
                <div className="bg-card p-12 text-foreground relative overflow-hidden border-b border-border/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black tracking-tighter flex items-center gap-6 uppercase premium-text-gradient italic">
                            <div className="p-3 bg-primary/20 rounded-2xl shadow-xl ring-1 ring-primary/30">
                                <Settings2 size={32} className="text-primary" strokeWidth={2.5} />
                            </div>
                            {currentType ? t('settings_pages.vehicle_types.dialog.title_edit') : t('settings_pages.vehicle_types.dialog.title_add')}
                        </DialogTitle>
                    </DialogHeader>
                </div>
                
                <form onSubmit={handleSubmit} className="p-12 space-y-10">
                    <div className="space-y-4">
                        <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-muted-foreground ml-4">{t('settings_pages.vehicle_types.dialog.name')} *</Label>
                        <Input 
                            value={formData.type_name}
                            onChange={(e) => setFormData({...formData, type_name: e.target.value})}
                            placeholder={t('settings_pages.vehicle_types.ui.name_placeholder')}
                            className="h-16 bg-muted/50 border-border/5 text-foreground font-black rounded-2xl px-8 text-xl uppercase tracking-widest focus:bg-muted/80 transition-all italic"
                            required
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-muted-foreground ml-4">{t('settings_pages.vehicle_types.dialog.desc')}</Label>
                        <Input 
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder={t('settings_pages.vehicle_types.ui.desc_placeholder')}
                            className="h-16 bg-muted/50 border-border/5 text-foreground font-black rounded-2xl px-8 text-xl uppercase tracking-widest focus:bg-muted/80 transition-all italic"
                        />
                    </div>
                    
                    {currentType && (
                        <div className="space-y-4">
                            <Label className="text-base font-bold font-black uppercase tracking-[0.1em] text-muted-foreground ml-4">{t('settings_pages.vehicle_types.ui.registry_status')}</Label>
                            <select 
                                value={formData.active_status}
                                onChange={(e) => setFormData({...formData, active_status: e.target.value})}
                                className="w-full h-16 bg-muted/50 border-2 border-border/5 rounded-2xl px-8 text-xl font-black uppercase tracking-widest text-foreground focus:border-primary/50 transition-all outline-none italic"
                            >
                                <option value="Active" className="bg-card">{t('settings_pages.vehicle_types.ui.active_node')}</option>
                                <option value="Inactive" className="bg-card">{t('settings_pages.vehicle_types.ui.offline_node')}</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-6 pt-10 border-t border-border/5 mt-12 mb-4">
                        <PremiumButton type="submit" disabled={isSubmitting} className="flex-[2] bg-primary hover:bg-primary/80 shadow-primary/20 h-20 rounded-3xl text-lg font-black tracking-widest uppercase italic">
                            {isSubmitting ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Save className="w-6 h-6 mr-4" strokeWidth={3} />}
                            {t('settings_pages.vehicle_types.ui.finalize')}
                        </PremiumButton>
                        <PremiumButton type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-border/5 h-20 rounded-3xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all uppercase font-black tracking-widest italic">
                            {t('settings_pages.vehicle_types.ui.abort')}
                        </PremiumButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

