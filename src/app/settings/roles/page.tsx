'use client'

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Shield, Save, CheckCircle2, Loader2 } from "lucide-react"
import { getRolePermissions, updateRolePermissions, RolePermission } from "@/lib/actions/permission-actions"
import { toast } from "sonner"
import { 
    SYSTEM_PERMISSIONS, 
    STANDARD_ROLES
} from "@/types/role"
import { Switch } from "@/components/ui/switch"

export default function RolesPage() {
    const [roles, setRoles] = useState<RolePermission[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        setError(null)
        const result = await getRolePermissions()
        
        let fetchedData: RolePermission[] = []
        if (result.success && result.data) {
             fetchedData = result.data
        } else if (result.error) {
             console.error(result.error)
             setError(result.error)
        }

        // Always populate standard roles
        const mergedData = [...fetchedData]
        
        STANDARD_ROLES.forEach(role => {
            if (!mergedData.find(r => r.Role === role)) {
                mergedData.push({ Role: role, Permissions: {} })
            }
        })
             
        setRoles(mergedData)
        setLoading(false)
    }

    const togglePermission = (roleIndex: number, permId: string) => {
        // Super Admin always has all true and is locked
        if (roles[roleIndex].Role === 'Super Admin') return 

        setRoles(prev => prev.map((role, idx) => {
            if (idx !== roleIndex) return role
            return {
                ...role,
                Permissions: {
                    ...(role.Permissions || {}),
                    [permId]: !(role.Permissions?.[permId] || false)
                }
            }
        }))
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

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <div>
                        <p className="font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                        <p className="text-sm opacity-80">{error}</p>
                        {error.includes('relation "Master_Role_Permissions" does not exist') && (
                            <p className="text-sm mt-1 underline">กรุณารัน SQL เพื่อสร้างตาราง Master_Role_Permissions</p>
                        )}
                    </div>
                </div>
            )}

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
                                        {SYSTEM_PERMISSIONS.map((perm) => (
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
