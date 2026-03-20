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
    ShieldCheck, 
    Target,
    Settings2,
    Database,
    X,
    Save
} from "lucide-react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog"
import { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType, VehicleType } from "@/lib/actions/vehicle-type-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function VehicleTypesPage() {
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
    if (!formData.type_name.trim()) return toast.warning("Protocol violation: Designation required")
    
    setIsSubmitting(true)
    try {
      if (currentType) {
        const res = await updateVehicleType(currentType.type_id, formData)
        if (res.success) {
          toast.success("Asset template synchronized")
          setIsDialogOpen(false)
          fetchTypes()
        } else {
            toast.error("Handshake failed: " + res.message)
        }
      } else {
        const res = await createVehicleType(formData)
        if (res.success) {
            toast.success("New asset class deployed")
            setIsDialogOpen(false)
            fetchTypes()
        } else {
            toast.error("Handshake failed: " + res.message)
        }
      }
    } catch {
        toast.error("Transmission error during commit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Confirm decommissioning of this asset class?")) return

    const res = await deleteVehicleType(id)
    if (res.success) {
        toast.success("Asset class purged from registry")
        fetchTypes()
    } else {
        toast.error("Handshake failed: " + res.message)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-[#0a0518]/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-[10px] group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    Command Control
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Truck size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic premium-text-gradient">
                            Fleet Nexus
                        </h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] mt-2 opacity-80 italic">Asset Class & Vehicle Specification Registry</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">MATRIX_SCAN: OPTIMIZED</span>
                </div>
                <PremiumButton onClick={handleOpenCreate} className="h-16 px-12 rounded-2xl bg-primary text-white border-0 shadow-[0_20px_50px_rgba(255,30,133,0.3)] gap-4 text-sm tracking-widest">
                    <Plus size={24} strokeWidth={3} />
                    ENLIST_ASSET_CLASS
                </PremiumButton>
            </div>
        </div>

        {/* Global Registry Table */}
        <div className="grid grid-cols-1 gap-8">
            <PremiumCard className="bg-[#0a0518]/40 border-2 border-white/5 shadow-3xl rounded-[4rem] overflow-hidden group/matrix">
                <div className="p-10 border-b border-white/5 bg-black/40 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white tracking-widest uppercase italic flex items-center gap-3">
                        <Database size={20} className="text-primary" />
                        Specification Nodes
                    </h3>
                    <div className="px-5 py-1.5 rounded-xl bg-primary/10 text-[9px] font-black text-primary uppercase tracking-[0.3em] border border-primary/20 italic">
                        TOTAL_CLASSES: {types.length}
                    </div>
                </div>

                <div className="relative overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-12 py-8 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Asset Designation</th>
                                <th className="px-8 py-8 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Operational Parameters</th>
                                <th className="px-8 py-8 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Status</th>
                                <th className="px-12 py-8 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-right italic">Command</th>
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
                                        <p className="mt-8 text-slate-700 font-black uppercase tracking-[0.6em] text-[10px]">Syncing Fleet Matrix...</p>
                                    </td>
                                </tr>
                            ) : types.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-40 text-slate-700 font-black uppercase tracking-[0.5em] text-xs">
                                        No asset classes detected in the registry
                                    </td>
                                </tr>
                            ) : (
                                types.map((type) => (
                                    <tr key={type.type_id} className="group/row hover:bg-primary/[0.03] transition-all duration-500">
                                        <td className="px-12 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover/row:bg-primary group-hover/row:text-white transition-all duration-500 shadow-xl group-hover/row:shadow-[0_0_30px_rgba(255,30,133,0.3)] group-hover/row:-rotate-3">
                                                    <Truck size={22} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <span className="font-black text-white text-xl tracking-tighter group-hover/row:text-primary transition-colors font-display uppercase italic">{type.type_name}</span>
                                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1 italic">V_MATRIX_ID: {type.type_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="max-w-xs">
                                                <p className="text-slate-400 font-bold text-sm tracking-tight leading-relaxed uppercase italic">
                                                    {type.description || '// NO_INTEL_PROVIDED'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className={cn(
                                                "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest border shadow-xl transition-all duration-500 group-hover/row:scale-105 italic",
                                                type.active_status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor]", type.active_status === 'Active' ? "bg-current animate-pulse" : "bg-rose-500")} />
                                                {type.active_status}
                                            </div>
                                        </td>
                                        <td className="px-12 py-8 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-all duration-500 translate-x-4 group-hover/row:translate-x-0">
                                                <button onClick={() => handleOpenEdit(type)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-primary/20 hover:border-primary/30 transition-all shadow-xl">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(type.type_id)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-rose-800 hover:bg-rose-500 hover:text-white transition-all shadow-xl">
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
                <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] italic">Fleet Specification & Capacity Matrix Node</p>
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
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">ASSET_SPECIFICATION_ADVISORY</p>
                <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-wider italic">
                    Asset class definitions impact load optimization and routing geometry. <br />
                    Decommissioning classes with active missions may result in grid sync failures.
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white gap-3 uppercase font-black text-[10px] tracking-[0.3em] ml-auto italic">
                <Activity size={18} /> VIEW_FLEET_CAPACITY
            </PremiumButton>
        </div>

        {/* Tactical Config Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-[#0a0518] border border-white/5 text-white max-w-xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[4rem] p-0 overflow-hidden ring-1 ring-white/10">
                <div className="bg-[#0c061d] p-12 text-white relative overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black tracking-tighter flex items-center gap-6 uppercase premium-text-gradient italic">
                            <div className="p-3 bg-primary/20 rounded-2xl shadow-xl ring-1 ring-primary/30">
                                <Settings2 size={32} className="text-primary" strokeWidth={2.5} />
                            </div>
                            {currentType ? 'Refine Asset' : 'Deploy Asset'}
                        </DialogTitle>
                    </DialogHeader>
                </div>
                
                <form onSubmit={handleSubmit} className="p-12 space-y-10">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-4">Asset Designation *</Label>
                        <Input 
                            value={formData.type_name}
                            onChange={(e) => setFormData({...formData, type_name: e.target.value})}
                            placeholder="E.G. 4-WHEEL_CORE / 6-WHEEL_HEAVY..."
                            className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl px-8 text-sm uppercase tracking-widest focus:bg-white/10 transition-all italic"
                            required
                        />
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-4">Operational Parameters</Label>
                        <Input 
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="LOAD_CAPACITY / AXLE_SPEC..."
                            className="h-16 bg-white/5 border-white/5 text-white font-black rounded-2xl px-8 text-sm uppercase tracking-widest focus:bg-white/10 transition-all italic"
                        />
                    </div>
                    
                    {currentType && (
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-4">Registry Status</Label>
                            <select 
                                value={formData.active_status}
                                onChange={(e) => setFormData({...formData, active_status: e.target.value})}
                                className="w-full h-16 bg-white/5 border-2 border-white/5 rounded-2xl px-8 text-sm font-black uppercase tracking-widest text-white focus:border-primary/50 transition-all outline-none italic"
                            >
                                <option value="Active" className="bg-[#0c061d]">ACTIVE_NODE</option>
                                <option value="Inactive" className="bg-[#0c061d]">OFFLINE_NODE</option>
                            </select>
                        </div>
                    )}

                    <div className="flex gap-6 pt-10 border-t border-white/5 mt-12 mb-4">
                        <PremiumButton type="submit" disabled={isSubmitting} className="flex-[2] bg-primary hover:bg-primary/80 shadow-primary/20 h-20 rounded-3xl text-lg font-black tracking-widest uppercase italic">
                            {isSubmitting ? <Loader2 className="w-6 h-6 mr-4 animate-spin" /> : <Save className="w-6 h-6 mr-4" strokeWidth={3} />}
                            FINALIZE_SPEC
                        </PremiumButton>
                        <PremiumButton type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-white/5 h-20 rounded-3xl text-slate-500 hover:text-white hover:bg-white/5 transition-all uppercase font-black tracking-widest italic">
                            Abort
                        </PremiumButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
