"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Building, 
  Mail, 
  User, 
  Save, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getAllBranches, updateBranchSettings, Branch } from "@/lib/supabase/branches"
import { toast } from "sonner"

export default function BranchSettingsPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<Record<string, { Email: string, Sender_Name: string }>>({})

  useEffect(() => {
    async function loadBranches() {
      const data = await getAllBranches()
      setBranches(data)
      
      const initialEditState: Record<string, { Email: string, Sender_Name: string }> = {}
      data.forEach(b => {
        initialEditState[b.Branch_ID] = {
          Email: b.Email || "",
          Sender_Name: b.Sender_Name || ""
        }
      })
      setEditState(initialEditState)
      setLoading(false)
    }
    loadBranches()
  }, [])

  const handleInputChange = (branchId: string, field: 'Email' | 'Sender_Name', value: string) => {
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
    } else {
      toast.error(`เกิดข้อผิดพลาด: ${result.error}`)
    }
    setSavingId(null)
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="text-primary" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Building className="text-primary" />
              จัดการสาขาและอีเมล
            </h1>
            <p className="text-muted-foreground mt-1">ตั้งค่าข้อมูลผู้ส่งอีเมลแยกตามสาขาสำหรับใบวางบิลและรายงาน</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">กำลังโหลดข้อมูลสาขา...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {branches.map((branch, index) => (
                <motion.div
                  key={branch.Branch_ID}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card border-border overflow-hidden hover:border-primary/30 transition-all group">
                    <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Building size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{branch.Branch_Name}</h3>
                          <p className="text-xs text-muted-foreground">ID: {branch.Branch_ID}</p>
                        </div>
                      </div>
                      {savingId === branch.Branch_ID ? (
                        <Button disabled size="sm" className="gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          กำลังบันทึก...
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleSave(branch.Branch_ID)}
                        >
                          <Save size={16} />
                          บันทึกการตั้งค่า
                        </Button>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Mail size={14} className="text-primary" />
                            อีเมลผู้ส่ง (Sender Email)
                          </Label>
                          <Input 
                            value={editState[branch.Branch_ID]?.Email}
                            onChange={(e) => handleInputChange(branch.Branch_ID, 'Email', e.target.value)}
                            placeholder="example@resend.dev"
                            className="bg-background border-border focus:border-primary transition-all"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            * อีเมลที่ใช้ส่งรายงาน POD และใบวางบิลจากสาขานี้
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <User size={14} className="text-primary" />
                            ชื่อผู้ส่ง (Sender Name)
                          </Label>
                          <Input 
                            value={editState[branch.Branch_ID]?.Sender_Name}
                            onChange={(e) => handleInputChange(branch.Branch_ID, 'Sender_Name', e.target.value)}
                            placeholder="ฝ่ายขนส่ง สาขา..."
                            className="bg-background border-border focus:border-primary transition-all"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            * ชื่อที่แสดงในกล่องจดหมายของผู้รับ
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {branches.length === 0 && (
              <Card className="bg-card border-border border-dashed p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle size={48} className="text-muted-foreground/30" />
                  <p className="text-muted-foreground">ไม่พบข้อมูลสาขาในระบบ</p>
                  <Button variant="outline" onClick={() => router.refresh()}>โหลดใหม่</Button>
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
           className="mt-12 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4"
        >
          <div className="p-2 rounded-full bg-primary/20 text-primary h-fit">
            <CheckCircle2 size={20} />
          </div>
          <div className="text-sm space-y-1">
            <p className="font-bold text-primary">คำแนะนำการใช้งาน</p>
            <p className="text-muted-foreground leading-relaxed">
              การตั้งค่าอีเมลแยกตามสาขาจะช่วยให้ลูกค้าจำแนกที่มาของรายงานได้ง่ายขึ้น หากสาขาใดไม่ได้ตั้งค่าไว้ ระบบจะใช้ค่าเริ่มต้นจากบริษัทส่วนกลางในการส่งอีเมล
            </p>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
