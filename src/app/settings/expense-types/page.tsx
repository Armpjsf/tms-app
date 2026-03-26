"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getExpenseTypes, addExpenseType, updateExpenseType, deleteExpenseType, ExpenseType } from "@/lib/supabase/master-data"
import {
  Coins,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  ArrowLeft,
  Activity,
  Target,
  ShieldAlert,
  Loader2,
  TrendingUp
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function ExpenseTypesPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newType, setNewType] = useState({ name: "", default_amount: 0 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const data = await getExpenseTypes()
    setExpenseTypes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = async () => {
    if (!newType.name.trim()) return
    await addExpenseType(newType.name, newType.default_amount)
    setNewType({ name: "", default_amount: 0 })
    setShowAddForm(false)
    toast.success(t('settings_pages.expense_types.toasts.deployed'))
    loadData()
  }

  const handleUpdate = async (id: string, updates: Partial<ExpenseType>) => {
    setExpenseTypes(prev => prev.map(et => et.id === id ? { ...et, ...updates } : et))
  }

  const saveUpdate = async (id: string) => {
    const item = expenseTypes.find(e => e.id === id)
    if (item) {
        await updateExpenseType(id, { name: item.name, default_amount: item.default_amount })
        toast.success(t('settings_pages.expense_types.toasts.synced'))
    }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('settings_pages.expense_types.toasts.confirm_del'))) {
      await deleteExpenseType(id)
      toast.success(t('settings_pages.expense_types.toasts.purged'))
      loadData()
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await updateExpenseType(id, { is_active: !currentStatus })
    loadData()
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
                    {t('settings_pages.expense_types.title') === 'รายการค่าใช้จ่าย (Resource Matrix)' ? 'Command Control' : 'Command Control'}
                    {/* Wait, I should probably use a generic key or just keep it premium. I'll use common 'command_control' if it exists or just localize manually */}
                    {t('settings_pages.company.command_control')}
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Coins size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">
                            {t('settings_pages.expense_types.title')}
                        </h1>
                        <p className="text-base font-bold font-black text-primary uppercase tracking-[0.2em] mt-2 opacity-80 italic">{t('settings_pages.expense_types.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-muted/50 border border-border/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,30,133,1)]" />
                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('settings_pages.expense_types.matrix_scan')}</span>
                </div>
                <PremiumButton onClick={() => setShowAddForm(true)} className="h-16 px-12 rounded-2xl bg-primary text-foreground border-0 shadow-[0_20px_50px_rgba(255,30,133,0.3)] gap-4 text-xl tracking-widest">
                    <Plus size={24} strokeWidth={3} />
                    {t('settings_pages.expense_types.enlist_new')}
                </PremiumButton>
            </div>
        </div>

        {/* Add Form Matrix */}
        {showAddForm && (
            <PremiumCard className="bg-background/60 border-2 border-primary/20 shadow-3xl rounded-[3rem] overflow-hidden group/add animate-in fade-in slide-in-from-top-10 duration-500">
                <div className="p-10 border-b border-border/5 bg-primary/5 flex items-center justify-between">
                    <h3 className="text-xl font-black text-foreground tracking-widest uppercase italic flex items-center gap-3">
                        <Plus size={20} className="text-primary" />
                        {t('settings_pages.expense_types.config_new')}
                    </h3>
                    <PremiumButton variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="rounded-xl border-border/10 text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </PremiumButton>
                </div>
                <div className="p-12">
                    <div className="grid grid-cols-12 gap-10 items-end">
                        <div className="col-span-12 md:col-span-6 space-y-4">
                            <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6">{t('settings_pages.expense_types.res_designation')}</Label>
                            <Input
                                value={newType.name}
                                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                                placeholder={t('settings_pages.expense_types.placeholder_name')}
                                className="h-16 bg-black/40 border-border/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-foreground font-black italic tracking-widest pl-8 shadow-inner"
                            />
                        </div>
                        <div className="col-span-12 md:col-span-4 space-y-4">
                            <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6">{t('settings_pages.expense_types.default_yield')}</Label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black italic">฿</span>
                                <Input
                                    type="number"
                                    value={newType.default_amount}
                                    onChange={(e) => setNewType({ ...newType, default_amount: Number(e.target.value) })}
                                    className="h-16 pl-12 bg-black/40 border-border/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-foreground font-black italic tracking-widest shadow-inner text-xl"
                                />
                            </div>
                        </div>
                        <div className="col-span-12 md:col-span-2">
                            <PremiumButton onClick={handleAdd} className="w-full h-16 rounded-[1.5rem] bg-primary text-foreground font-black italic tracking-widest shadow-xl border-0 gap-3">
                                <Save size={20} /> {t('settings_pages.expense_types.deploy')}
                            </PremiumButton>
                        </div>
                    </div>
                </div>
            </PremiumCard>
        )}

        {/* Global Resource Feed */}
        <div className="grid grid-cols-1 gap-8">
            <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/matrix">
                <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
                    <h3 className="text-xl font-black text-foreground tracking-widest uppercase italic flex items-center gap-3">
                        <Activity size={20} className="text-primary" />
                        {t('settings_pages.expense_types.registry')}
                    </h3>
                    <div className="px-5 py-1.5 rounded-xl bg-primary/10 text-base font-bold font-black text-primary uppercase tracking-[0.1em] border border-primary/20 italic">
                        {t('settings_pages.expense_types.scan_results').replace('{count}', expenseTypes.length.toString())}
                    </div>
                </div>
                <div className="p-4 md:p-10">
                    <div className="space-y-6">
                        {loading ? (
                            <div className="py-40 flex flex-col items-center justify-center opacity-30">
                                <Loader2 size={60} className="animate-spin text-primary mb-6" />
                                <span className="text-base font-bold font-black text-foreground uppercase tracking-[0.6em]">{t('settings_pages.expense_types.syncing')}</span>
                            </div>
                        ) : (
                            expenseTypes.map((et) => (
                                <div 
                                    key={et.id} 
                                    className={cn(
                                        "p-8 rounded-[2.5rem] border-2 transition-all duration-500 group/pref flex flex-col md:flex-row md:items-center gap-8 relative overflow-hidden",
                                        et.is_active ? "bg-muted/30 border-border/5 hover:border-primary/30" : "bg-transparent border-border/5 opacity-40 grayscale"
                                    )}
                                >
                                    <div className="flex items-center gap-6 shrink-0">
                                        <div className="p-3 text-muted-foreground cursor-move hover:text-primary transition-colors">
                                            <GripVertical size={24} />
                                        </div>
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl border border-border/10",
                                            et.is_active ? "bg-black/40" : "bg-muted/50"
                                        )}>
                                            <TrendingUp size={28} className={cn(et.is_active ? "text-primary" : "text-muted-foreground")} />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-10">
                                        {editingId === et.id ? (
                                            <>
                                                <div className="flex-[2] space-y-2">
                                                    <Label className="text-base font-bold font-black text-primary uppercase ml-4">{t('settings_pages.expense_types.edit_name')}</Label>
                                                    <Input
                                                        value={et.name}
                                                        onChange={(e) => handleUpdate(et.id, { name: e.target.value })}
                                                        className="h-14 bg-black/60 border-primary/30 rounded-xl text-foreground font-black italic pl-6"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-base font-bold font-black text-primary uppercase ml-4">{t('settings_pages.expense_types.edit_yield')}</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black italic">฿</span>
                                                        <Input
                                                            type="number"
                                                            value={et.default_amount || 0}
                                                            onChange={(e) => handleUpdate(et.id, { default_amount: Number(e.target.value) })}
                                                            className="h-14 pl-12 bg-black/60 border-primary/30 rounded-xl text-foreground font-black italic"
                                                        />
                                                    </div>
                                                </div>
                                                <PremiumButton size="sm" onClick={() => saveUpdate(et.id)} className="h-14 w-14 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-foreground transition-all">
                                                    <Save size={20} />
                                                </PremiumButton>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex-[2]">
                                                    <h3 className={cn(
                                                        "text-2xl font-black uppercase tracking-widest italic group-hover/matrix:text-primary transition-colors",
                                                        et.is_active ? "text-foreground" : "text-muted-foreground"
                                                    )}>
                                                        {et.name}
                                                    </h3>
                                                    <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60">{t('settings_pages.expense_types.id_vector')}: {et.id.substring(0, 8)}...</p>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-base font-bold font-black text-primary uppercase tracking-[0.1em] mb-1 italic opacity-60">{t('settings_pages.expense_types.base_yield')}</p>
                                                    <p className="text-3xl font-black text-foreground italic tracking-tighter">
                                                        {et.default_amount ? `฿${et.default_amount.toLocaleString()}` : '฿0.00'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleToggleActive(et.id, et.is_active)}
                                                        className={cn(
                                                            "px-5 py-2 rounded-xl text-base font-bold font-black uppercase tracking-widest transition-all italic border-2 shadow-2xl",
                                                            et.is_active 
                                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' 
                                                              : 'bg-muted/50 text-muted-foreground border-border/5'
                                                        )}
                                                    >
                                                        {et.is_active ? t('settings_pages.expense_types.enabled_node') : t('settings_pages.expense_types.offline_node')}
                                                    </button>
                                                    <PremiumButton 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => setEditingId(et.id)}
                                                        className="w-12 h-12 rounded-xl bg-muted/50 border border-border/5 text-muted-foreground hover:text-foreground hover:bg-primary/20 hover:border-primary/30 transition-all"
                                                    >
                                                        <Edit size={18} />
                                                    </PremiumButton>
                                                    <PremiumButton 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => handleDelete(et.id)}
                                                        className="w-12 h-12 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500/40 hover:text-foreground hover:bg-rose-500 transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </PremiumButton>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {et.is_active && (
                                        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/[0.02] to-transparent pointer-events-none" />
                                    )}
                                </div>
                            ))
                        )}

                        {!loading && expenseTypes.length === 0 && (
                            <div className="py-40 text-center opacity-20">
                                <ShieldAlert size={80} className="mx-auto text-muted-foreground mb-8" />
                                <p className="text-xl font-black uppercase tracking-[0.6em] text-foreground italic">{t('settings_pages.expense_types.registry_depleted')}</p>
                                <p className="text-base font-bold font-bold text-muted-foreground uppercase tracking-widest mt-4">{t('settings_pages.expense_types.init_protocols')}</p>
                            </div>
                        )}
                    </div>
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
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">{t('settings_pages.expense_types.advisory')}</p>
                <p className="text-xl font-bold text-muted-foreground leading-relaxed uppercase tracking-wider italic">
                    {t('settings_pages.expense_types.advisory_desc')}
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-border/10 text-foreground gap-3 uppercase font-black text-base font-bold tracking-[0.3em] ml-auto italic">
                <Activity size={18} /> {t('settings_pages.expense_types.view_trends')}
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}

