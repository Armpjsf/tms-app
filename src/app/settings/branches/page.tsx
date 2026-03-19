"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Building, 
  Mail, 
  Save, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  MapPin,
  Phone,
  CheckCircle2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getAllBranches, updateBranchSettings, createBranch, deleteBranch } from "@/lib/supabase/branches"
import type { Branch } from "@/lib/supabase/branches"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function BranchSettingsPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({
    Branch_ID: "",
    Branch_Name: "",
    Address: "",
    Phone: "",
    Email: "",
    Sender_Name: ""
  })
  const [editState, setEditState] = useState<Record<string, Branch>>({})

  const loadBranches = async () => {
    setLoading(true)
    const data = await getAllBranches()
    const branchesData = data || []
    setBranches(branchesData)
    
    const initialEditState: Record<string, Branch> = {}
    branchesData.forEach(b => {
      initialEditState[b.Branch_ID] = { ...b }
    })
    setEditState(initialEditState)
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    if (isMounted) {
      loadBranches()
    }
    return () => { isMounted = false }
  }, [])

  const handleInputChange = (branchId: string, field: keyof Branch, value: string) => {
    setEditState(prev => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [field]: value
      }
    }))
  }

  const handleSave = async (branchId: string) => {
    setSavingId(branchId)
    const settings = editState[branchId]
    
    const result = await updateBranchSettings(branchId, settings)
    
    if (result.success) {
      toast.success("บันทึกการตั้งค่าสาขาเรียบร้อยแล้ว")
      router.refresh()
    } else {
      toast.error(`เกิดข้อผิดพลาด: ${result.error}`)
    }
    setSavingId(null)
  }

  const handleDelete = async (branchId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบสาขานี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) return
    
    setDeletingId(branchId)
    const result = await deleteBranch(branchId)
    
    if (result.success) {
      toast.success("ลบสาขาเรียบร้อยแล้ว")
      setBranches(prev => prev.filter(b => b.Branch_ID !== branchId))
    } else {
      toast.error(`เกิดข้อผิดพลาด: ${result.error}`)
    }
    setDeletingId(null)
  }

  const handleCreateBranch = async () => {
    if (!newBranch.Branch_ID || !newBranch.Branch_Name) {
      toast.error("กรุณาระบุรหัสและชื่อสาขา")
      return
    }

    setCreating(true)
    try {
      const result = await createBranch(newBranch as Branch)
      
      if (result.success) {
        toast.success("สร้างสาขาใหม่เรียบร้อยแล้ว")
        setIsCreateDialogOpen(false)
        setNewBranch({
          Branch_ID: "",
          Branch_Name: "",
          Address: "",
          Phone: "",
          Email: "",
          Sender_Name: ""
        })
        await loadBranches()
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${result.error}`)
      }
    } catch (err) {
      console.error("Connection error:", err)
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setCreating(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-slate-900/50 p-8 rounded-3xl border border-white/5 backdrop-blur-xl mt-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="rounded-full hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="text-primary" />
            </Button>
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                <Building className="text-primary" />
                BRANCH Management
              </h1>
              <p className="text-slate-400 mt-1 font-medium">จัดการสาขา ข้อมูลการติดต่อ และการส่งเอกสาร</p>
            </div>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            เพิ่มสาขาใหม่
          </Button>
        </div>

        {loading && branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">กำลังโหลดข้อมูลสาขา...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {branches.map((branch, index) => (
                <motion.div
                  key={branch.Branch_ID}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-slate-900/40 border-white/5 overflow-hidden hover:border-primary/30 transition-all group shadow-xl">
                    <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                          <Building size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight">{branch.Branch_Name}</h3>
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/5">
                               ID: {branch.Branch_ID}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {savingId === branch.Branch_ID ? (
                          <Button disabled size="sm" variant="ghost" className="gap-2 text-primary">
                            <Loader2 size={16} className="animate-spin" />
                            Saving...
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost"
                            size="sm" 
                            className="gap-2 text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => handleSave(branch.Branch_ID)}
                          >
                            <Save size={16} />
                            Save
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={deletingId === branch.Branch_ID}
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDelete(branch.Branch_ID)}
                        >
                          {deletingId === branch.Branch_ID ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Basic Info */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 text-primary">
                            <Building size={16} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">General Information</span>
                          </div>
                          <div className="grid gap-4">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Branch Name</Label>
                                <Input 
                                  value={editState[branch.Branch_ID]?.Branch_Name || ""}
                                  onChange={(e) => handleInputChange(branch.Branch_ID, 'Branch_Name', e.target.value)}
                                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Address</Label>
                                <Input 
                                  value={editState[branch.Branch_ID]?.Address || ""}
                                  onChange={(e) => handleInputChange(branch.Branch_ID, 'Address', e.target.value)}
                                  placeholder="Address..."
                                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Phone</Label>
                                <Input 
                                  value={editState[branch.Branch_ID]?.Phone || ""}
                                  onChange={(e) => handleInputChange(branch.Branch_ID, 'Phone', e.target.value)}
                                  placeholder="Phone number..."
                                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                                />
                             </div>
                          </div>
                        </div>

                        {/* Email Settings */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <Mail size={16} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Email & Notification Config</span>
                          </div>
                          <div className="grid gap-4">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Sender Email</Label>
                                <Input 
                                  value={editState[branch.Branch_ID]?.Email || ""}
                                  onChange={(e) => handleInputChange(branch.Branch_ID, 'Email', e.target.value)}
                                  placeholder="example@resend.dev"
                                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 transition-all text-white font-medium"
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Sender Name</Label>
                                <Input 
                                  value={editState[branch.Branch_ID]?.Sender_Name || ""}
                                  onChange={(e) => handleInputChange(branch.Branch_ID, 'Sender_Name', e.target.value)}
                                  placeholder="Logistic Team (Branch Name)"
                                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 transition-all text-white font-medium"
                                />
                             </div>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium capitalize">
                              * configuration for automated reports and digital POD documents for this specific branch.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {branches.length === 0 && !loading && (
              <Card className="bg-slate-900/40 border-white/5 border-dashed p-16 text-center rounded-3xl backdrop-blur-sm">
                <div className="flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-white/5 border border-white/10">
                    <AlertCircle size={48} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white mb-2">No branches found</p>
                    <p className="text-slate-400">Add your first branch to start managing your fleet.</p>
                  </div>
                  <Button variant="outline" onClick={() => loadBranches()} className="border-white/10 hover:bg-white/10 text-white rounded-xl px-8">
                    Refresh List
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Info Box */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5 }}
           className="mt-12 p-6 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4"
        >
          <div className="p-2 rounded-full bg-primary/20 text-primary h-fit">
            <CheckCircle2 size={24} />
          </div>
          <div className="text-sm space-y-1">
            <p className="font-bold text-primary">คำแนะนำการใช้งาน</p>
            <p className="text-muted-foreground leading-relaxed">
              การตั้งค่าอีเมลแยกตามสาขาจะช่วยให้ลูกค้าจำแนกที่มาของรายงานได้ง่ายขึ้น หากสาขาใดไม่ได้ตั้งค่าไว้ ระบบจะใช้ค่าเริ่มต้นจากบริษัทส่วนกลางในการส่งอีเมล 
              คุณสามารถเพิ่มสาขาใหม่ได้จากปุ่ม "เพิ่มสาขาใหม่" ด้านบนครับ
            </p>
          </div>
        </motion.div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/10 text-white rounded-3xl p-0 overflow-hidden">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Plus size={24} />
                </div>
                CREATE NEW BRANCH
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium pt-2">
                เพิ่มสาขาใหม่ในระบบเพื่อกระจายงานและแยกการจัดการข้อมูล
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    Branch ID * <span className="text-primary text-xs">(Unique)</span>
                  </Label>
                  <Input 
                    value={newBranch.Branch_ID || ""}
                    onChange={(e) => setNewBranch(prev => ({ ...prev, Branch_ID: e.target.value }))}
                    placeholder="e.g. BKK, HY"
                    className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Branch Name *</Label>
                  <Input 
                    value={newBranch.Branch_Name || ""}
                    onChange={(e) => setNewBranch(prev => ({ ...prev, Branch_Name: e.target.value }))}
                    placeholder="ชื่อสาขา"
                    className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Address</Label>
                <Input 
                  value={newBranch.Address || ""}
                  onChange={(e) => setNewBranch(prev => ({ ...prev, Address: e.target.value }))}
                  placeholder="สถานที่ตั้งสาขา"
                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Phone</Label>
                <Input 
                  value={newBranch.Phone || ""}
                  onChange={(e) => setNewBranch(prev => ({ ...prev, Phone: e.target.value }))}
                  placeholder="เบอร์โทรศัพท์ติดต่อ"
                  className="h-12 bg-white/5 border-white/5 rounded-xl focus:ring-primary focus:border-primary transition-all text-white font-medium"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1 h-12 rounded-2xl border border-white/5 text-slate-300 hover:bg-white/5 font-bold"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBranch}
                disabled={creating}
                className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : "CREATE BRANCH"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
