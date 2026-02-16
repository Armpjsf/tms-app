"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Edit, Trash2, Search, Loader2 } from "lucide-react"
import { getUsers, createUser, updateUser, deleteUser, UserData } from "@/lib/actions/user-actions"
import { getRoles } from "@/lib/actions/role-actions"
import { getBranches, Branch } from "@/lib/actions/branch-actions"
import { getAllCustomers, Customer } from "@/lib/supabase/customers"
import { Role } from "@/types/role"

export default function UserSettingsPage() {
    const [users, setUsers] = useState<any[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [editingUser, setEditingUser] = useState<string | null>(null) // Username
    const [formData, setFormData] = useState<Partial<UserData>>({
        Username: "",
        Password: "",
        Name: "",
        Branch_ID: "",
        Role_ID: 0,
        Active_Status: "Active",
        Customer_ID: null,
        Permissions: {
            view_history: true,
            track_jobs: true
        }
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [usersData, rolesData, branchesData, customersData] = await Promise.all([
            getUsers(),
            getRoles(),
            getBranches(),
            getAllCustomers()
        ])
        setUsers(usersData || [])
        setRoles(rolesData || [])
        setBranches(branchesData || [])
        setCustomers(customersData?.data || [])
        setLoading(false)
    }

    const handleOpenDialog = (user?: any) => {
        if (user) {
            setEditingUser(user.Username)
            setFormData({
                Username: user.Username,
                Password: "", // Don't show password
                Name: user.Name,
                Branch_ID: user.Branch_ID,
                Role_ID: 0, // Will map from user.Role
                Active_Status: user.Active_Status,
                Customer_ID: user.Customer_ID,
                Permissions: user.Permissions || { view_history: true, track_jobs: true }
            })

            // Map string Role to ID for the Select component
            const roleMap: Record<string, number> = {
                'Super Admin': 1,
                'Admin': 2,
                'Staff': 3,
                'Driver': 4,
                'Customer': 5
            }
            if (user.Role && roleMap[user.Role]) {
                setFormData(prev => ({ ...prev, Role_ID: roleMap[user.Role] }))
            }
        } else {
            setEditingUser(null)
            setFormData({
                Username: "",
                Password: "",
                Name: "",
                Branch_ID: "",
                Role_ID: 0,
                Active_Status: "Active",
                Customer_ID: null,
                Permissions: { view_history: true, track_jobs: true }
            })
        }
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.Username || !formData.Name || !formData.Branch_ID || !formData.Role_ID) {
            return alert("กรุณากรอกข้อมูลให้ครบถ้วน")
        }

        if (!editingUser && !formData.Password) {
            return alert("กรุณากำหนดรหัสผ่าน")
        }
        
        setSaving(true)
        try {
            if (editingUser) {
                // Remove password if empty to prevent overwrite
                const updateData = { ...formData }
                if (!updateData.Password) delete updateData.Password

                await updateUser(editingUser, updateData)
                alert("แก้ไขข้อมูลเรียบร้อย")
            } else {
                await createUser(formData as UserData)
                alert("สร้างผู้ใช้งานเรียบร้อย")
            }
            setIsDialogOpen(false)
            loadData()
        } catch (e: any) {
            console.error(e)
            alert("เกิดข้อผิดพลาด: " + (e.message || "Unknown"))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (username: string) => {
        if (!confirm(`คุณต้องการลบผู้ใช้ ${username} ใช่หรือไม่?`)) return
        await deleteUser(username)
        loadData()
    }

    const filteredUsers = users.filter(u => 
        u.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Username?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="text-blue-400" />
                        จัดการผู้ใช้งาน (User Management)
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">เพิ่ม ลบ แก้ไข ข้อมูลพนักงานและผู้ใช้งานระบบ</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มผู้ใช้งาน
                </Button>
            </div>

            <div className="flex items-center space-x-2 mb-6 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                <Search className="text-slate-500 ml-2" />
                <Input 
                    placeholder="ค้นหาชื่อ หรือ Username..." 
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
                                    <th className="px-6 py-4">ชื่อผู้ใช้ (Username)</th>
                                    <th className="px-6 py-4">ชื่อ - นามสกุล</th>
                                    <th className="px-6 py-4">สาขา</th>
                                    <th className="px-6 py-4">บทบาท</th>
                                    <th className="px-6 py-4">สถานะ</th>
                                    <th className="px-6 py-4 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">ไม่พบข้อมูล</td></tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.Username} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {user.Username}
                                                {user.Customer_ID && (
                                                    <div className="text-[10px] text-blue-400 font-normal">
                                                        Client: {user.Master_Customers?.Customer_Name || user.Customer_ID}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{user.Name}</td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {user.Master_Branches?.Branch_Name || user.Branch_ID || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs">
                                                    {user.Master_Roles?.Role_Name || "No Role"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.Active_Status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {user.Active_Status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)} className="text-slate-400 hover:text-white hover:bg-slate-700">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(user.Username)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
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
                        <DialogTitle>
                            {editingUser ? "แก้ไขผู้ใช้งาน" : "สร้างผู้ใช้งานใหม่"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username *</Label>
                                <Input 
                                    value={formData.Username} 
                                    onChange={e => setFormData({...formData, Username: e.target.value})} 
                                    disabled={!!editingUser}
                                    className="bg-slate-800 border-slate-700 disabled:opacity-50" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password {editingUser && "(เว้นว่างถ้าไม่เปลี่ยน)"}</Label>
                                <Input 
                                    type="password"
                                    value={formData.Password} 
                                    onChange={e => setFormData({...formData, Password: e.target.value})} 
                                    className="bg-slate-800 border-slate-700" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>ชื่อ - นามสกุล *</Label>
                            <Input 
                                value={formData.Name} 
                                onChange={e => setFormData({...formData, Name: e.target.value})} 
                                className="bg-slate-800 border-slate-700" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>สาขา (Branch) *</Label>
                                <Select 
                                    value={formData.Branch_ID} 
                                    onValueChange={v => setFormData({...formData, Branch_ID: v})}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="เลือกสาขา" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {branches.map(b => (
                                            <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                                                {b.Branch_Name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>บทบาท (Role) *</Label>
                                <Select 
                                    value={formData.Role_ID?.toString()} 
                                    onValueChange={v => setFormData({...formData, Role_ID: parseInt(v)})}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="เลือกบทบาท" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {roles.map(r => (
                                            <SelectItem key={r.Role_ID} value={r.Role_ID.toString()}>
                                                {r.Role_Name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Customer Link Section */}
                        <div className="space-y-4 p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                            <div className="space-y-2">
                                <Label className="text-blue-400 text-xs font-bold uppercase">Customer Link (สำหรับลูกค้า)</Label>
                                <Select 
                                    value={formData.Customer_ID || "none"} 
                                    onValueChange={v => setFormData({...formData, Customer_ID: v === "none" ? null : v})}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700">
                                        <SelectValue placeholder="เชื่อมโยงกับลูกค้า (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        <SelectItem value="none">-- ไม่ระบุ (พนักงานทั่วไป) --</SelectItem>
                                        {customers.map(c => (
                                            <SelectItem key={c.Customer_ID} value={c.Customer_ID}>
                                                {c.Customer_Name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.Customer_ID && (
                                <div className="space-y-3 pt-2">
                                    <Label className="text-slate-400 text-[11px] mb-2 block">กำหนดสิทธิ์การเข้าถึง (Permissions):</Label>
                                    <div className="flex items-center justify-between p-2 rounded bg-slate-800/30">
                                        <span className="text-sm">ดูประวัติงาน (View History)</span>
                                        <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                                            checked={formData.Permissions?.view_history}
                                            onChange={e => setFormData({
                                                ...formData, 
                                                Permissions: { ...formData.Permissions, view_history: e.target.checked }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded bg-slate-800/30">
                                        <span className="text-sm">ติดตามงาน Real-time (Track Jobs)</span>
                                        <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                                            checked={formData.Permissions?.track_jobs}
                                            onChange={e => setFormData({
                                                ...formData, 
                                                Permissions: { ...formData.Permissions, track_jobs: e.target.checked }
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                             <Label>สถานะ</Label>
                             <Select 
                                value={formData.Active_Status} 
                                onValueChange={v => setFormData({...formData, Active_Status: v})}
                            >
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                    <SelectItem value="Active">ใช้งาน (Active)</SelectItem>
                                    <SelectItem value="Inactive">ระงับ (Inactive)</SelectItem>
                                </SelectContent>
                            </Select>
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
