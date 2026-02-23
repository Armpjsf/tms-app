"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Edit, Trash2, Search, Loader2 } from "lucide-react"
import { createUser, updateUser, deleteUser, UserData, getCurrentUserRole, createBulkUsers } from "@/lib/actions/user-actions"
import { Customer } from "@/lib/supabase/customers"
import { ExcelImport } from "@/components/ui/excel-import"
import { FileSpreadsheet, Shield } from "lucide-react"
import { useBranch } from "@/components/providers/branch-provider"
import { createClient } from "@/utils/supabase/client"
import { STANDARD_ROLES, SYSTEM_PERMISSIONS, StandardRole } from "@/types/role"
import { getRolePermissions } from "@/lib/actions/permission-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useCallback } from "react"

export default function UserSettingsPage() {
    const { branches, isAdmin, selectedBranch } = useBranch()
    const [userList, setUserList] = useState<(UserData & { Master_Customers?: { Customer_Name: string } | null })[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [currentRoleId, setCurrentRoleId] = useState<number | null>(null)
    
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const [allRolePermissions, setAllRolePermissions] = useState<Record<string, Record<string, boolean>>>({})
    
    // Form State
    const [editingUser, setEditingUser] = useState<string | null>(null) // Username
    const [formData, setFormData] = useState<Partial<UserData>>({
        Username: "",
        Password: "",
        Name: "",
        Branch_ID: "",
        Role: "Staff", 
        Active_Status: "Active",
        Customer_ID: null,
        Permissions: {}
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const supabase = createClient()

            // Query users directly from browser client
            let usersQuery = supabase
                .from('Master_Users')
                .select('*, Master_Customers ( Customer_Name )')
            if (selectedBranch && selectedBranch !== 'All') {
                usersQuery = usersQuery.eq('Branch_ID', selectedBranch)
            }

            // Query customers directly from browser client
            const customersQuery = supabase.from('Master_Customers').select('*').order('Customer_Name').limit(1000)

            const [usersResult, customersResult, userInfo, rolesResult] = await Promise.all([
                usersQuery.order('Username'),
                customersQuery,
                getCurrentUserRole(),
                getRolePermissions()
            ])

            setUserList(usersResult.data || [])
            setCustomers(customersResult.data || [])
            setCurrentRoleId(userInfo?.roleId || 3)

            if (rolesResult.success && rolesResult.data) {
                const perms: Record<string, Record<string, boolean>> = {}
                rolesResult.data.forEach(r => {
                    perms[r.Role] = r.Permissions
                })
                setAllRolePermissions(perms)
            }
        } finally {
            setLoading(false)
        }
    }, [selectedBranch])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleOpenDialog = (user?: UserData) => {
        if (user) {
            setEditingUser(user.Username)
            setFormData({
                Username: user.Username,
                Password: "", // Don't show password
                Name: user.Name,
                Branch_ID: user.Branch_ID || "",
                Role: (user.Role as StandardRole) || "Staff",
                Active_Status: user.Active_Status,
                Customer_ID: user.Customer_ID,
                Permissions: user.Permissions || {}
            })
        } else {
            setEditingUser(null)
            const defaultRole = "Staff"
            setFormData({
                Username: "",
                Password: "",
                Name: "",
                Branch_ID: selectedBranch && selectedBranch !== 'All' ? selectedBranch : "",
                Role: defaultRole, 
                Active_Status: "Active",
                Customer_ID: null,
                Permissions: allRolePermissions[defaultRole] || {}
            })
        }
        setIsDialogOpen(true)
    }

    const handleRoleChange = (role: string) => {
        const standardRole = role as StandardRole
        setFormData(prev => ({
            ...prev,
            Role: standardRole,
            Permissions: allRolePermissions[role] || prev.Permissions || {}
        }))
    }

    const toggleGranularPermission = (permId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            Permissions: {
                ...(prev.Permissions || {}),
                [permId]: checked
            }
        }))
    }

    const handleSave = async () => {
        if (!formData.Username || !formData.Name || !formData.Branch_ID || !formData.Role) {
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
        } catch (e) {
            const error = e as Error
            console.error(error)
            alert("เกิดข้อผิดพลาด: " + (error.message || "Unknown"))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (username: string) => {
        if (!confirm(`คุณต้องการลบผู้ใช้ ${username} ใช่หรือไม่?`)) return
        await deleteUser(username)
        loadData()
    }

    const filteredUsers = userList.filter(u => 
        u.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Username?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Users className="text-blue-500" />
                        จัดการผู้ใช้งาน (User Management)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">เพิ่ม ลบ แก้ไข ข้อมูลพนักงานและผู้ใช้งานระบบ</p>
                </div>
                <div className="flex gap-2">
                     <ExcelImport 
                        trigger={
                            <Button variant="outline" className="gap-2 border-border hover:bg-muted">
                                <FileSpreadsheet size={16} /> 
                                นำเข้า Excel
                            </Button>
                        }
                        title="นำเข้าผู้ใช้งาน"
                        onImport={createBulkUsers}
                        templateData={[
                            { Username: "user01", Name: "นาย สมชาย ใจดี", Branch: "สำนักงานใหญ่", Role: "Staff", Password: "change_me" },
                            { Username: "driver01", Name: "นาย ขับรถ เก่ง", Branch: "สาขา 1", Role: "Driver" }
                        ]}
                        templateFilename="template_users.xlsx"
                    />
                    <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        เพิ่มผู้ใช้งาน
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-2 mb-6 bg-card/50 p-2 rounded-xl border border-border">
                <Search className="text-muted-foreground ml-2" />
                <Input 
                    id="search-users-input"
                    name="search-users-input"
                    autoComplete="off"
                    placeholder="ค้นหาชื่อ หรือ Username..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-none bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                />
            </div>

            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border font-bold">
                                <tr>
                                    <th className="px-6 py-4">ชื่อผู้ใช้ (Username)</th>
                                    <th className="px-6 py-4">ชื่อ - นามสกุล</th>
                                    <th className="px-6 py-4">สาขา</th>
                                    <th className="px-6 py-4">บทบาท</th>
                                    <th className="px-6 py-4">สถานะ</th>
                                    <th className="px-6 py-4 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">ไม่พบข้อมูล</td></tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.Username} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                {user.Username}
                                                {user.Customer_ID && (
                                                    <div className="text-[10px] text-blue-500 font-normal">
                                                        Client: {user.Master_Customers?.Customer_Name || user.Customer_ID}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-foreground/80">{user.Name}</td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {user.Branch_ID || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs text-center inline-block min-w-[80px]">
                                                    {user.Role || "No Role"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.Active_Status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {user.Active_Status}
                                                </span>
                                            </td>
                                             <td className="px-6 py-4 text-right space-x-2">
                                                 <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleOpenDialog(user)} 
                                                    className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                                                    disabled={(user.Role === "Super Admin" || user.Role === "Admin") && currentRoleId !== 1}
                                                 >
                                                     <Edit className="w-4 h-4" />
                                                 </Button>
                                                 <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleDelete(user.Username)} 
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                                                    disabled={(user.Role === "Super Admin" || user.Role === "Admin") && currentRoleId !== 1}
                                                 >
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
                <DialogContent className="bg-background border-border text-foreground max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
                    <DialogHeader className="p-6 border-b border-border bg-card">
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-500" />
                            {editingUser ? "แก้ไขผู้ใช้งาน" : "สร้างผู้ใช้งานใหม่"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-400">Username *</Label>
                                <Input 
                                    value={formData.Username} 
                                    onChange={e => setFormData({...formData, Username: e.target.value})} 
                                    disabled={!!editingUser}
                                    className="bg-slate-800 border-slate-700 disabled:opacity-50" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400">Password {editingUser && "(เว้นว่างถ้าไม่เปลี่ยน)"}</Label>
                                <Input 
                                    type="password"
                                    value={formData.Password || ""} 
                                    onChange={e => setFormData({...formData, Password: e.target.value})} 
                                    className="bg-slate-800 border-slate-700" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-400">ชื่อ - นามสกุล *</Label>
                            <Input 
                                value={formData.Name} 
                                onChange={e => setFormData({...formData, Name: e.target.value})} 
                                className="bg-slate-800 border-slate-700" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-400">สาขา (Branch) *</Label>
                                {isAdmin ? (
                                    <Select 
                                        value={formData.Branch_ID || ""} 
                                        onValueChange={v => setFormData({...formData, Branch_ID: v})}
                                    >
                                        <SelectTrigger className="bg-card border-border text-foreground">
                                            <SelectValue placeholder="เลือกสาขา" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border text-foreground">
                                            {branches.map(b => (
                                                <SelectItem key={b.Branch_ID} value={b.Branch_ID}>
                                                    {b.Branch_Name} ({b.Branch_ID})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input 
                                        value={formData.Branch_ID || ""} 
                                        onChange={e => setFormData({...formData, Branch_ID: e.target.value})}
                                        placeholder="เช่น สำนักงานใหญ่, สาขา 1"
                                        className="bg-slate-800 border-slate-700 text-white" 
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400">บทบาท (Role) *</Label>
                                <Select 
                                    value={formData.Role || ""} 
                                    onValueChange={handleRoleChange}
                                >
                                    <SelectTrigger className="bg-card border-border text-foreground">
                                        <SelectValue placeholder="เลือกบทบาท" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        {STANDARD_ROLES.map(role => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator className="bg-slate-800" />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-blue-500 font-bold uppercase text-xs">สิทธิ์การใช้งาน (Granular Permissions)</Label>
                                <span className="text-[10px] text-muted-foreground italic">* อ้างอิงตามบทบาท และสามารถปรับเปลี่ยนเฉพาะบุคคลได้</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {SYSTEM_PERMISSIONS.map((perm) => (
                                    <div key={perm.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                        <Checkbox 
                                            id={`perm-${perm.id}`}
                                            checked={formData.Permissions?.[perm.id] || false}
                                            onCheckedChange={(checked) => toggleGranularPermission(perm.id, !!checked)}
                                            className="mt-1"
                                        />
                                        <div className="grid gap-1.5 leading-none cursor-pointer" onClick={() => toggleGranularPermission(perm.id, !formData.Permissions?.[perm.id])}>
                                            <label
                                                htmlFor={`perm-${perm.id}`}
                                                className="text-sm font-medium leading-none text-slate-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {perm.label}
                                            </label>
                                            <p className="text-[10px] text-slate-500">
                                                {perm.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Customer Link (Optional) */}
                        <div className="space-y-2 p-4 rounded-lg bg-muted/20 border border-border">
                            <Label className="text-muted-foreground text-xs font-bold uppercase">เชื่อมโยงลูกค้า (Customer Link)</Label>
                            <Select 
                                value={formData.Customer_ID || "none"} 
                                onValueChange={v => setFormData({...formData, Customer_ID: v === "none" ? null : v})}
                            >
                                <SelectTrigger className="bg-card border-border">
                                    <SelectValue placeholder="เชื่อมโยงกับลูกค้า (Optional)" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="none">-- ไม่ระบุ (พนักงานทั่วไป) --</SelectItem>
                                    {customers.map(c => (
                                        <SelectItem key={c.Customer_ID} value={c.Customer_ID}>
                                            {c.Customer_Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 pb-4">
                             <Label className="text-muted-foreground">สถานะการใช้งาน</Label>
                             <Select 
                                value={formData.Active_Status} 
                                onValueChange={v => setFormData({...formData, Active_Status: v})}
                            >
                                <SelectTrigger className="bg-card border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="Active">ใช้งาน (Active)</SelectItem>
                                    <SelectItem value="Inactive">ระงับ (Inactive)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
 
                    <DialogFooter className="p-6 border-t border-border bg-muted/20">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border">ยกเลิก</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึกข้อมูล
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
