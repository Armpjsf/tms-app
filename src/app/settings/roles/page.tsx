"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, Plus, Edit, Trash2, Save, Loader2, Check } from "lucide-react"
import { getRoles, createRole, updateRole, deleteRole } from "@/lib/actions/role-actions"
import { Role, MODULES, ACTIONS, RolePermissions } from "@/types/role"
import { toast } from "sonner"

export default function RoleSettingsPage() {
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    
    // Form State
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [roleName, setRoleName] = useState("")
    const [description, setDescription] = useState("")
    const [permissions, setPermissions] = useState<RolePermissions>({})

    useEffect(() => {
        loadRoles()
    }, [])

    const loadRoles = async () => {
        setLoading(true)
        const data = await getRoles()
        setRoles(data)
        setLoading(false)
    }

    const handleOpenDialog = (role?: Role) => {
        if (role) {
            setEditingRole(role)
            setRoleName(role.Role_Name)
            setDescription(role.Description || "")
            setPermissions(role.Permissions || {})
        } else {
            setEditingRole(null)
            setRoleName("")
            setDescription("")
            setPermissions({})
        }
        setIsDialogOpen(true)
    }

    const handlePermissionChange = (moduleId: string, actionId: string, checked: boolean) => {
        setPermissions(prev => {
            const modulePerms = prev[moduleId] || []
            let newModulePerms
            if (checked) {
                newModulePerms = [...modulePerms, actionId]
            } else {
                newModulePerms = modulePerms.filter(p => p !== actionId)
            }
            return { ...prev, [moduleId]: newModulePerms }
        })
    }

    const handleSave = async () => {
        if (!roleName) return alert("กรุณาระบุชื่อบทบาท")
        
        setSaving(true)
        try {
            if (editingRole) {
                await updateRole(editingRole.Role_ID, {
                    Role_Name: roleName,
                    Description: description,
                    Permissions: permissions
                })
                alert("บันทึกเรียบร้อย")
            } else {
                await createRole({
                    Role_Name: roleName,
                    Description: description,
                    Permissions: permissions
                })
                alert("สร้างบทบาทเรียบร้อย")
            }
            setIsDialogOpen(false)
            loadRoles()
        } catch (e) {
            console.error(e)
            alert("เกิดข้อผิดพลาด")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("คุณต้องการลบบทบาทนี้ใช่หรือไม่?")) return
        await deleteRole(id)
        loadRoles()
    }

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-indigo-400" />
                        ตั้งค่าบทบาท (Roles & Permissions)
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">กำหนดสิทธิ์การใช้งานสำหรับแต่ละตำแหน่ง</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มบทบาทใหม่
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-white text-center py-8">Loading...</div>
                ) : roles.map((role) => (
                    <Card key={role.Role_ID} className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    {role.Role_Name}
                                </CardTitle>
                                <p className="text-sm text-slate-400 font-normal mt-1">{role.Description}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(role)} className="border-slate-700 hover:bg-slate-800">
                                    <Edit className="w-4 h-4 mr-2" />
                                    แก้ไขสิทธิ์
                                </Button>
                                {role.Role_ID > 3 && ( // Prevent deleting default roles if needed, logical check only
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(role.Role_ID)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(role.Permissions || {}).map(([mod, actions]) => (
                                    <div key={mod} className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 border border-slate-700 flex items-center gap-2">
                                        <span className="font-bold text-indigo-400 uppercase">{mod}:</span>
                                        <span>{(actions as string[]).join(", ")}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRole ? "แก้ไขบทบาท" : "สร้างบทบาทใหม่"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ชื่อบทบาท (Role Name) *</Label>
                                <Input 
                                    value={roleName} 
                                    onChange={e => setRoleName(e.target.value)} 
                                    className="bg-slate-800 border-slate-700" 
                                    placeholder="e.g. Accountant"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>รายละเอียด (Description)</Label>
                                <Input 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    className="bg-slate-800 border-slate-700" 
                                    placeholder="e.g. Can manage invoices"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-800 pt-4">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-indigo-400" />
                                กำหนดสิทธิ์การใช้งาน Details
                            </h3>
                            
                            <div className="space-y-4">
                                {MODULES.map(module => (
                                    <div key={module.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                                        <div className="mb-3 font-semibold text-indigo-300 border-b border-slate-700/50 pb-2">
                                            {module.label}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            {ACTIONS.map(action => (
                                                <div key={action.id} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`${module.id}-${action.id}`}
                                                        checked={permissions[module.id]?.includes(action.id)}
                                                        onCheckedChange={(checked) => handlePermissionChange(module.id, action.id, checked as boolean)}
                                                        className="border-slate-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                    />
                                                    <Label 
                                                        htmlFor={`${module.id}-${action.id}`}
                                                        className="text-xs text-slate-300 font-normal cursor-pointer"
                                                    >
                                                        {action.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700">ยกเลิก</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
