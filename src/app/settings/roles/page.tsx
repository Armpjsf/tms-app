'use client'

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Shield, Save, CheckCircle2, Loader2 } from "lucide-react"
import { getRolePermissions, updateRolePermissions, RolePermission } from "@/lib/actions/permission-actions"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

const DEFINED_PERMISSIONS = [
    { id: 'manage_drivers', label: 'Manage Drivers', desc: 'Create, Edit, Delete Drivers' },
    { id: 'manage_vehicles', label: 'Manage Vehicles', desc: 'Create, Edit, Delete Vehicles' },
    { id: 'manage_jobs', label: 'Manage Jobs', desc: 'Create, Specific Edit Jobs' },
    { id: 'job_admin_actions', label: 'Job Admin Actions', desc: 'Override status, Close jobs' },
    { id: 'view_reports', label: 'View Reports', desc: 'Access Analytics & Financials' },
    { id: 'manage_users', label: 'Manage Users', desc: 'Create, Edit Users (Restricted)' },
    { id: 'view_history', label: 'View History', desc: 'View Job History' },
    { id: 'manage_subcontractors', label: 'Manage Subcontractors', desc: 'Manage Subcontractor list' },
]

export default function RolesPage() {
    const [roles, setRoles] = useState<RolePermission[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const result = await getRolePermissions()
        if (result.success && result.data) {
             // Ensure we have entries for standard roles even if DB is empty
             const standardRoles = ['Super Admin', 'Admin', 'Staff', 'Driver']
             const mergedData = [...result.data]
             
             standardRoles.forEach(role => {
                 if (!mergedData.find(r => r.Role === role)) {
                     mergedData.push({ Role: role, Permissions: {} })
                 }
             })
             
             setRoles(mergedData)
        }
        setLoading(false)
    }

    const togglePermission = (roleIndex: number, permId: string) => {
        const newRoles = [...roles]
        const currentPerms = newRoles[roleIndex].Permissions || {}
        
        // Super Admin always has all true
        if (newRoles[roleIndex].Role === 'Super Admin') return 

        newRoles[roleIndex].Permissions = {
            ...currentPerms,
            [permId]: !currentPerms[permId]
        }
        setRoles(newRoles)
    }

    const handleSave = async (role: RolePermission) => {
        setSaving(true)
        try {
            const result = await updateRolePermissions(role.Role, role.Permissions)
            if (result.success) {
                toast.success(`Saved permissions for ${role.Role}`)
            } else {
                toast.error(result.error || "Failed to save")
            }
        } catch {
            toast.error("An error occurred")
        } finally {
            setSaving(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Shield className="text-purple-400" />
                    บทบาทและสิทธิ์การใช้งาน (Roles & Permissions)
                </h1>
                <p className="text-slate-400">กำหนดสิทธิ์การเข้าถึงเมนูและการจัดการข้อมูลสำหรับแต่ละตำแหน่ง</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {roles.map((role, index) => (
                        <Card key={role.Role} className={`border-slate-800 bg-slate-900/50 ${role.Role === 'Super Admin' ? 'border-purple-500/30 bg-purple-500/5' : ''}`}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className={`text-xl ${role.Role === 'Super Admin' ? 'text-purple-400' : 'text-white'}`}>
                                        {role.Role}
                                    </CardTitle>
                                    <CardDescription>
                                        {role.Role === 'Super Admin' ? 'Full System Access' : 'Customizable Permissions'}
                                    </CardDescription>
                                </div>
                                {role.Role !== 'Super Admin' && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleSave(role)}
                                        disabled={saving}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {role.Role === 'Super Admin' ? (
                                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 flex items-center gap-3 text-purple-300">
                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-sm">Super Admin has restricted full access to all system features. Permissions cannot be modified.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {DEFINED_PERMISSIONS.map((perm) => (
                                            <div key={perm.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base text-slate-200 cursor-pointer" htmlFor={`${role.Role}-${perm.id}`}>
                                                        {perm.label}
                                                    </Label>
                                                    <p className="text-xs text-slate-500">
                                                        {perm.desc}
                                                    </p>
                                                </div>
                                                <Switch 
                                                    id={`${role.Role}-${perm.id}`}
                                                    checked={role.Permissions?.[perm.id] || false} 
                                                    onCheckedChange={() => togglePermission(index, perm.id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </DashboardLayout>
    )
}
