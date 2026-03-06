"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
    Plus, 
    Edit, 
    Trash2, 
    Search, 
    Loader2, 
    Banknote,
    Briefcase,
    ShieldCheck,
    TrendingUp
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from "@/lib/actions/subcontractor-actions"
import { getSubcontractorPerformance, getOperationalStats } from "@/lib/supabase/analytics"
import { Subcontractor } from "@/types/subcontractor"
import { useBranch } from "@/components/providers/branch-provider"
import { cn } from "@/lib/utils"

export default function SubcontractorsPage() {
    const { selectedBranch, branches } = useBranch()
    const [list, setList] = useState<Subcontractor[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [stats, setStats] = useState<any>(null)

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<Partial<Subcontractor>>({
        Sub_ID: "",
        Sub_Name: "",
        Tax_ID: "",
        Bank_Name: "",
        Bank_Account_No: "",
        Bank_Account_Name: "",
        Branch_ID: "",
        Active_Status: "Active"
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        const [data, performance, ops] = await Promise.all([
            getAllSubcontractors(selectedBranch),
            getSubcontractorPerformance(undefined, undefined, selectedBranch),
            getOperationalStats(selectedBranch)
        ])
        setList(data)
        setStats({ performance, ops })
        setLoading(false)
    }, [selectedBranch])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleOpenDialog = (item?: Subcontractor) => {
        if (item) {
            setEditingId(item.Sub_ID)
            setFormData(item)
        } else {
            setEditingId(null)
            setFormData({
                Sub_ID: "",
                Sub_Name: "",
                Tax_ID: "",
                Bank_Name: "",
                Bank_Account_No: "",
                Bank_Account_Name: "",
                Branch_ID: selectedBranch === 'All' ? "" : selectedBranch,
                Active_Status: "Active"
            })
        }
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.Sub_ID || !formData.Sub_Name) {
            return alert("กรุณากรอกรหัสและชื่อบริษัท")
        }
        
        setSaving(true)
        try {
            let res;
            if (editingId) {
                res = await updateSubcontractor(editingId, formData)
            } else {
                res = await createSubcontractor(formData)
            }

            if (res.success) {
                setIsDialogOpen(false)
                loadData()
            } else {
                alert("Error: " + res.error)
            }
        } catch (error: unknown) {
            alert("เกิดข้อผิดพลาด: " + (error as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบข้อมูลนี้ใช่หรือไม่?")) return
        const res = await deleteSubcontractor(id)
        if (res.success) loadData()
        else alert("Error: " + res.error)
    }

    const filtered = list.filter(i => 
        i.Sub_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.Sub_ID.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <DashboardLayout>
            {/* Premium Header Container */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12 bg-white/40 p-10 rounded-[2.5rem] border border-white/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
                
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-2xl shadow-amber-500/20 text-white transform group-hover:scale-110 transition-transform duration-500">
                            <Briefcase size={32} />
                        </div>
                        Sub-Contractors
                    </h1>
                    <p className="text-gray-500 font-bold ml-[4.5rem] uppercase tracking-[0.2em] text-[10px]">Logistics Network • Partner Management</p>
                </div>

                <div className="flex flex-wrap gap-4 relative z-10">
                    <PremiumButton onClick={() => handleOpenDialog()} className="h-14 px-8 rounded-2xl shadow-amber-500/20">
                        <Plus size={24} className="mr-2" />
                        เพิ่มบริษัทรถร่วม
                    </PremiumButton>
                </div>
            </div>

            {/* Subcontractor Analytics Grid */}
            {!loading && stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <PremiumCard className="p-8 group backdrop-blur-2xl border-amber-500/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 rounded-2xl bg-amber-500 shadow-xl shadow-amber-500/20 text-white transform group-hover:scale-110 transition-all duration-500">
                                <Briefcase size={20} />
                            </div>
                            <div className="px-3 py-1 bg-amber-50 rounded-full border border-amber-100 italic font-black text-[9px] text-amber-600 uppercase tracking-widest">Network</div>
                        </div>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Total Partners</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{list.length}</p>
                    </PremiumCard>

                    <PremiumCard className="p-8 group backdrop-blur-2xl border-blue-500/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/20 text-white transform group-hover:scale-110 transition-all duration-500">
                                <TrendingUp size={20} />
                            </div>
                            <div className="px-3 py-1 bg-blue-50 rounded-full border border-blue-100 italic font-black text-[9px] text-blue-600 uppercase tracking-widest">Share</div>
                        </div>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Subcontractor Share</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">
                            {stats.performance.find((p: any) => p.name.includes('Sub'))?.count || 0} <span className="text-sm text-gray-400 font-bold tracking-normal ml-1">Jobs</span>
                        </p>
                    </PremiumCard>

                    <PremiumCard className="p-8 group backdrop-blur-2xl border-emerald-500/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/20 text-white transform group-hover:scale-110 transition-all duration-500">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 italic font-black text-[9px] text-emerald-600 uppercase tracking-widest">Quality</div>
                        </div>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">On-Time Reliability</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{stats.ops.fleet.onTimeDelivery.toFixed(1)}%</p>
                    </PremiumCard>
                </div>
            )}

            {/* Search Bar */}
            <div className="mb-12 relative group max-w-2xl">
                <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-4 px-4">
                        <Search className="text-amber-500 animate-pulse" size={24} />
                        <Input
                            placeholder="ค้นหาชื่อหรือรหัสบริษัท..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus-visible:ring-0 text-xl font-black text-gray-900 placeholder:text-gray-300 tracking-tighter"
                        />
                    </div>
                </div>
            </div>

            <PremiumCard className="overflow-hidden p-0 border-white/40 bg-white/20 backdrop-blur-md">
                <div className="relative w-full overflow-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Partner Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Channel</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-20">
                                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                                        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Partners...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        No partners found in the network
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.Sub_ID} className="group hover:bg-white/40 transition-all duration-300">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-black text-xs shadow-sm group-hover:scale-110 transition-transform">
                                                    ID
                                                </div>
                                                <span className="font-black text-gray-900 tracking-tighter">{item.Sub_ID}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div>
                                                <div className="font-black text-gray-900 tracking-tighter group-hover:text-amber-600 transition-colors">{item.Sub_Name}</div>
                                                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <ShieldCheck size={10} className="text-emerald-500" />
                                                    Tax: {item.Tax_ID || "PENDING"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {item.Bank_Account_No ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Banknote size={14} className="text-emerald-500" />
                                                        <span className="text-xs font-black text-gray-700">{item.Bank_Name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 tracking-wider ml-6">{item.Bank_Account_No}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-300 uppercase italic">Not Specified</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                                item.Active_Status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                                            )}>
                                                <span className={cn("w-1 h-1 rounded-full", item.Active_Status === 'Active' ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                                                {item.Active_Status}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PremiumButton variant="outline" size="sm" onClick={() => handleOpenDialog(item)} className="h-9 w-9 p-0 rounded-xl">
                                                    <Edit className="w-4 h-4" />
                                                </PremiumButton>
                                                <PremiumButton variant="outline" size="sm" onClick={() => handleDelete(item.Sub_ID)} className="h-9 w-9 p-0 rounded-xl text-red-500 border-red-50 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </PremiumButton>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </PremiumCard>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "แก้ไขบริษัทรถร่วม" : "เพิ่มบริษัทรถร่วม"}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>รหัสบริษัท (ID) *</Label>
                                <Input 
                                    value={formData.Sub_ID} 
                                    onChange={e => setFormData({...formData, Sub_ID: e.target.value})} 
                                    disabled={!!editingId}
                                    className="bg-gray-100 border-gray-200" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>เลขประจำตัวผู้เสียภาษี</Label>
                                <Input 
                                    value={formData.Tax_ID || ""} 
                                    onChange={e => setFormData({...formData, Tax_ID: e.target.value})} 
                                    className="bg-gray-100 border-gray-200" 
                                />
                            </div>
                        </div>

                            <div className="space-y-2">
                                <Label>ชื่อบริษัทรถร่วม *</Label>
                                <Input 
                                    value={formData.Sub_Name} 
                                    onChange={e => setFormData({...formData, Sub_Name: e.target.value})} 
                                    className="bg-gray-100 border-gray-200" 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>สาขา (Branch) *</Label>
                                <Select 
                                    value={formData.Branch_ID || ""} 
                                    onValueChange={(v: string) => setFormData({...formData, Branch_ID: v})}
                                >
                                    <SelectTrigger className="bg-gray-100 border-gray-200">
                                        <SelectValue placeholder="เลือกสาขา" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                                        {branches.map(b => (
                                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                                                {b.Branch_Name} ({b.Branch_ID})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                        <div className="p-4 rounded-lg bg-white/80 border border-gray-200 space-y-4">
                            <Label className="text-emerald-500 text-xs font-bold uppercase">ข้อมูลบัญชีธนาคารส่วนกลาง (Payment)</Label>
                            
                            <div className="space-y-2">
                                <Label>ธนาคาร</Label>
                                <Input 
                                    value={formData.Bank_Name || ""} 
                                    onChange={e => setFormData({...formData, Bank_Name: e.target.value})} 
                                    placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                                    className="bg-gray-100 border-gray-200" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>เลขที่บัญชี</Label>
                                    <Input 
                                        value={formData.Bank_Account_No || ""} 
                                        onChange={e => setFormData({...formData, Bank_Account_No: e.target.value})} 
                                        className="bg-gray-100 border-gray-200" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ชื่อบัญชี</Label>
                                    <Input 
                                        value={formData.Bank_Account_Name || ""} 
                                        onChange={e => setFormData({...formData, Bank_Account_Name: e.target.value})} 
                                        className="bg-gray-100 border-gray-200" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <PremiumButton variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-200">ยกเลิก</PremiumButton>
                        <PremiumButton onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-orange-700 shadow-amber-500/20">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </PremiumButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
