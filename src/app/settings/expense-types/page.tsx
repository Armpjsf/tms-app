"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  GripVertical
} from "lucide-react"

export default function ExpenseTypesPage() {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newType, setNewType] = useState({ name: "", default_amount: 0 })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const data = await getExpenseTypes()
    setExpenseTypes(data)
  }

  const handleAdd = async () => {
    if (!newType.name.trim()) return
    await addExpenseType(newType.name, newType.default_amount)
    setNewType({ name: "", default_amount: 0 })
    setShowAddForm(false)
    loadData()
  }

  const handleUpdate = async (id: string, updates: Partial<ExpenseType>) => {
    // Optimistic update for inputs
    setExpenseTypes(prev => prev.map(et => et.id === id ? { ...et, ...updates } : et))
  }

  const saveUpdate = async (id: string) => {
    const item = expenseTypes.find(e => e.id === id)
    if (item) {
        await updateExpenseType(id, { name: item.name, default_amount: item.default_amount })
    }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm("ยืนยันลบประเภทค่าใช้จ่ายนี้?")) {
      await deleteExpenseType(id)
      loadData()
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await updateExpenseType(id, { is_active: !currentStatus })
    loadData()
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Coins className="text-amber-400" />
            ประเภทค่าใช้จ่าย
          </h1>
          <p className="text-sm text-slate-400 mt-1">จัดการหัวข้อค่าใช้จ่ายสำหรับใช้ในการสร้างงาน</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" /> เพิ่มประเภท
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-5 space-y-2">
                <Label className="text-slate-400">ชื่อประเภท</Label>
                <Input
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="เช่น ค่าทางด่วน"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="col-span-4 space-y-2">
                <Label className="text-slate-400">จำนวนเริ่มต้น (ไม่บังคับ)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                  <Input
                    type="number"
                    value={newType.default_amount}
                    onChange={(e) => setNewType({ ...newType, default_amount: Number(e.target.value) })}
                    className="pl-8 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="col-span-3 flex gap-2">
                <Button onClick={handleAdd} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-1" /> บันทึก
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-slate-700">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">รายการประเภทค่าใช้จ่าย</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {expenseTypes.map((et) => (
              <div 
                key={et.id} 
                className={`p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors ${
                  !et.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="text-slate-600 cursor-move">
                  <GripVertical className="w-5 h-5" />
                </div>

                {editingId === et.id ? (
                  <>
                    <div className="flex-1">
                      <Input
                        value={et.name}
                        onChange={(e) => handleUpdate(et.id, { name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                        <Input
                          type="number"
                          value={et.default_amount || 0}
                          onChange={(e) => handleUpdate(et.id, { default_amount: Number(e.target.value) })}
                          className="pl-8 bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <Button size="sm" onClick={() => saveUpdate(et.id)} className="bg-emerald-600">
                      <Save className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-white font-medium">{et.name}</p>
                    </div>
                    <div className="w-32 text-slate-400">
                      {et.default_amount ? `฿${et.default_amount.toLocaleString()}` : '-'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(et.id, et.is_active)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          et.is_active 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {et.is_active ? 'ใช้งาน' : 'ปิดใช้'}
                      </button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setEditingId(et.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(et.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {expenseTypes.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                ยังไม่มีประเภทค่าใช้จ่าย
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
