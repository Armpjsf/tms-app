"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Building2, Plus, Edit, Trash2, Search, Loader2, Banknote } from "lucide-react"
import { getAllSubcontractors } from "@/lib/supabase/subcontractors"
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from "@/lib/actions/subcontractor-actions"
import { Subcontractor } from "@/types/subcontractor"

export default function SubcontractorsPage() {
    const [list, setList] = useState<Subcontractor[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<Partial<Subcontractor>>({
        Sub_ID: "",
        Sub_Name: "",
        Tax_ID: "",
        Bank_Name: "",
        Bank_Account_No: "",
        Bank_Account_Name: "",
        Active_Status: "Active"
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const data = await getAllSubcontractors()
        setList(data)
        setLoading(false)
    }

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
        } catch (e: any) {
            alert("เกิดข้อผิดพลาด")
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Building2 className="text-blue-400" />
                        จัดการบริษัทรถร่วม (Subcontractors)
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">จัดการรายชื่อบริษัทนิติบุคคลและข้อมูลการชำระเงินส่วนกลาง</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มบริษัทรถร่วม
                </Button>
            </div>

            <div className="flex items-center space-x-2 mb-6 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                <Search className="text-slate-500 ml-2" />
                <Input 
                    placeholder="ค้นหาชื่อหรือรหัสบริษัท..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-slate-500"
                />
            </div>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-slate-900 text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">รหัส</th>
                                    <th className="px-6 py-4">ชื่อบริษัท</th>
                                    <th className="px-6 py-4">เลขบัญชีธนาคาร</th>
                                    <th className="px-6 py-4">สถานะ</th>
                                    <th className="px-6 py-4 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">ไม่พบข้อมูล</td></tr>
                                ) : (
                                    filtered.map((item) => (
                                        <tr key={item.Sub_ID} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{item.Sub_ID}</td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <div>{item.Sub_Name}</div>
                                                <div className="text-[10px] text-slate-500">Tax ID: {item.Tax_ID || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {item.Bank_Account_No ? (
                                                    <div className="flex items-center gap-2">
                                                        <Banknote size={14} className="text-emerald-500" />
                                                        <span>{item.Bank_Name} {item.Bank_Account_No}</span>
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${item.Active_Status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {item.Active_Status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)} className="text-slate-400 hover:text-white">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.Sub_ID)} className="text-red-400 hover:text-red-300">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
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
                                    className="bg-slate-800 border-slate-700" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>เลขประจำตัวผู้เสียภาษี</Label>
                                <Input 
                                    value={formData.Tax_ID || ""} 
                                    onChange={e => setFormData({...formData, Tax_ID: e.target.value})} 
                                    className="bg-slate-800 border-slate-700" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>ชื่อบริษัทรถร่วม *</Label>
                            <Input 
                                value={formData.Sub_Name} 
                                onChange={e => setFormData({...formData, Sub_Name: e.target.value})} 
                                className="bg-slate-800 border-slate-700" 
                            />
                        </div>

                        <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 space-y-4">
                            <Label className="text-blue-400 text-xs font-bold uppercase">ข้อมูลบัญชีธนาคารส่วนกลาง (Payment)</Label>
                            
                            <div className="space-y-2">
                                <Label>ธนาคาร</Label>
                                <Input 
                                    value={formData.Bank_Name || ""} 
                                    onChange={e => setFormData({...formData, Bank_Name: e.target.value})} 
                                    placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                                    className="bg-slate-800 border-slate-700" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>เลขที่บัญชี</Label>
                                    <Input 
                                        value={formData.Bank_Account_No || ""} 
                                        onChange={e => setFormData({...formData, Bank_Account_No: e.target.value})} 
                                        className="bg-slate-800 border-slate-700" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ชื่อบัญชี</Label>
                                    <Input 
                                        value={formData.Bank_Account_Name || ""} 
                                        onChange={e => setFormData({...formData, Bank_Account_Name: e.target.value})} 
                                        className="bg-slate-800 border-slate-700" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700">ยกเลิก</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
