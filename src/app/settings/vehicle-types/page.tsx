'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Loader2, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType, VehicleType } from "@/lib/actions/vehicle-type-actions"
import Link from "next/link"
import { toast } from "sonner"

export default function VehicleTypesPage() {
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
  const fetchTypes = async () => {
    setLoading(true)
    const data = await getVehicleTypes()
    setTypes(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTypes()
  }, [])

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
    setIsSubmitting(true)

    try {
      if (currentType) {
        // Edit
        const res = await updateVehicleType(currentType.type_id, formData)
        if (res.success) {
          toast.success("บันทึกข้อมูลเรียบร้อย")
          setIsDialogOpen(false)
          fetchTypes()
        } else {
            toast.error(res.message)
        }
      } else {
        // Create
        const res = await createVehicleType(formData)
        if (res.success) {
            toast.success("เพิ่มข้อมูลเรียบร้อย")
            setIsDialogOpen(false)
            fetchTypes()
        } else {
            toast.error(res.message)
        }
      }
    } catch {
        toast.error("เกิดข้อผิดพลาดในการบันทึก")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันการลบประเภทรถนี้?")) return

    const res = await deleteVehicleType(id)
    if (res.success) {
        toast.success("ลบข้อมูลเรียบร้อย")
        fetchTypes()
    } else {
        toast.error(res.message)
    }
  }

  return (
    <div className="container mx-auto p-6 text-white max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
            <Link href="/settings">
                <Button variant="ghost" size="icon" className="hover:bg-white/10">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
            <h1 className="text-2xl font-bold">จัดการประเภทรถ (Vehicle Types)</h1>
        </div>

        <div className="flex justify-between items-center mb-6">
            <p className="text-slate-400">กำหนดประเภทรถที่ใช้งานในระบบ</p>
            <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus size={16} /> เติ่มประเภทรถ
            </Button>
        </div>

        {/* List */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            {loading ? (
                <div className="p-8 text-center text-slate-500">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                    กำลังโหลดข้อมูล...
                </div>
            ) : types.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    ไม่พบข้อมูลประเภทรถ
                </div>
            ) : (
                <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 text-sm uppercase">
                        <tr>
                            <th className="px-6 py-3 font-medium">ชื่อประเภท</th>
                            <th className="px-6 py-3 font-medium">รายละเอียด</th>
                            <th className="px-6 py-3 font-medium">สถานะ</th>
                            <th className="px-6 py-3 font-medium text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {types.map((type) => (
                            <tr key={type.type_id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium">{type.type_name}</td>
                                <td className="px-6 py-4 text-slate-400">{type.description || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        type.active_status === 'Active' 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : 'bg-red-500/10 text-red-400'
                                    }`}>
                                        {type.active_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={() => handleOpenEdit(type)}>
                                        <Edit size={16} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(type.type_id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle>{currentType ? 'แก้ไขประเภทรถ' : 'เพิ่มประเภทรถใหม่'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>ชื่อประเภทรถ</Label>
                        <Input 
                            value={formData.type_name}
                            onChange={(e) => setFormData({...formData, type_name: e.target.value})}
                            placeholder="เช่น 4-Wheel, 6-Wheel"
                            className="bg-slate-950 border-slate-800"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>รายละเอียด (ไม่บังคับ)</Label>
                        <Input 
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="คำอธิบายเพิ่มเติม"
                            className="bg-slate-950 border-slate-800"
                        />
                    </div>
                    
                    {currentType && (
                        <div className="space-y-2">
                            <Label>สถานะ</Label>
                            <select 
                                value={formData.active_status}
                                onChange={(e) => setFormData({...formData, active_status: e.target.value})}
                                className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Active">Active (ใช้งาน)</option>
                                <option value="Inactive">Inactive (ยกเลิก)</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            บันทึก
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  )
}
