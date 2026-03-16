
'use client'

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
    Shield, Save, CheckCircle2, Loader2, Target, 
    FileText, Truck, Wallet, Users, Settings, Search,
    Lock, AlertCircle
} from "lucide-react"
import { getRolePermissions, updateRolePermissions, RolePermission } from "@/lib/actions/permission-actions"
import { toast } from "sonner"
import { 
    SYSTEM_PERMISSIONS, 
    STANDARD_ROLES,
    PERMISSION_CATEGORIES
} from "@/types/role"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const CATEGORY_ICONS: Record<string, any> = {
    Executive: Target,
    Operations: FileText,
    Fleet: Truck,
    Financial: Wallet,
    People: Users,
    System: Settings
}

export default function RolesPage() {
    const [roles, setRoles] = useState<RolePermission[]>([])
    const [selectedRoleIndex, setSelectedRoleIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchParams] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const result = await getRolePermissions()
        let fetchedData: RolePermission[] = []
        
        if (result.success && result.data) {
             fetchedData = result.data.map(item => ({
                 ...item,
                 Permissions: typeof item.Permissions === 'string' 
                     ? JSON.parse(item.Permissions) 
                     : (item.Permissions || {})
             }))
        }

        const mergedData: RolePermission[] = []
        STANDARD_ROLES.forEach(roleName => {
            const existing = fetchedData.find(r => r.Role === roleName)
            mergedData.push({
                Role: roleName,
                Permissions: existing ? existing.Permissions : {}
            })
        })
             
        setRoles(mergedData)
        setLoading(false)
    }

    const togglePermission = (permId: string) => {
        if (roles[selectedRoleIndex].Role === 'Super Admin') return 

        setRoles(prev => {
            const newRoles = [...prev]
            const roleToUpdate = { ...newRoles[selectedRoleIndex] }
            
            // Ensure Permissions is an object
            const currentPerms = typeof roleToUpdate.Permissions === 'string'
                ? JSON.parse(roleToUpdate.Permissions)
                : { ...(roleToUpdate.Permissions || {}) }

            roleToUpdate.Permissions = {
                ...currentPerms,
                [permId]: !currentPerms[permId]
            }
            
            newRoles[selectedRoleIndex] = roleToUpdate
            return newRoles
        })
    }

    const handleSave = async () => {
        const role = roles[selectedRoleIndex]
        setSaving(true)
        try {
            const result = await updateRolePermissions(role.Role, role.Permissions)
            if (result.success) toast.success(`Updated security matrix for ${role.Role}`)
            else toast.error(result.error || "Failed to save")
        } catch {
            toast.error("An error occurred")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <DashboardLayout>
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
            </div>
        </DashboardLayout>
    )

    const activeRole = roles[selectedRoleIndex]
    const isSuperAdmin = activeRole.Role === 'Super Admin'

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
                {/* Enterprise Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            <Shield className="text-purple-500" size={32} />
                            Security Control Center
                        </h1>
                        <p className="text-purple-400 font-black mt-1 uppercase tracking-widest text-[10px]">Access Matrix & Authorization Management</p>
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving || isSuperAdmin}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-6 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 relative z-10"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Commit Access Changes
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Role Sidebar */}
                    <div className="lg:col-span-3 space-y-2">
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 ml-2">System Roles</p>
                        {roles.map((role, idx) => (
                            <button
                                key={role.Role}
                                onClick={() => setSelectedRoleIndex(idx)}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border group",
                                    selectedRoleIndex === idx 
                                    ? "bg-white border-emerald-500 shadow-lg shadow-emerald-500/5 translate-x-2" 
                                    : "bg-white/50 border-transparent hover:bg-white hover:border-slate-200 text-slate-500"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                        selectedRoleIndex === idx ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                    )}>
                                        {role.Role === 'Super Admin' ? <Lock size={18} /> : <Users size={18} />}
                                    </div>
                                    <span className={cn("font-black text-sm uppercase tracking-tight", selectedRoleIndex === idx ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900")}>
                                        {role.Role}
                                    </span>
                                </div>
                                {selectedRoleIndex === idx && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </button>
                        ))}
                    </div>

                    {/* Permissions Matrix */}
                    <div className="lg:col-span-9 space-y-6">
                        {isSuperAdmin ? (
                            <div className="bg-purple-50 border-2 border-purple-100 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                                <div className="w-20 h-20 bg-purple-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-purple-500/30">
                                    <Lock size={40} />
                                </div>
                                <div className="max-w-md">
                                    <h3 className="text-2xl font-black text-purple-900 tracking-tight mb-2">Master Override Enabled</h3>
                                    <p className="text-purple-600/80 font-medium text-sm leading-relaxed">
                                        Super Admin account has hard-coded full access to all system modules. This security profile cannot be modified to ensure system stability.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {PERMISSION_CATEGORIES.map(category => {
                                    const Icon = CATEGORY_ICONS[category.id] || Shield
                                    const catPerms = SYSTEM_PERMISSIONS.filter(p => p.category === category.id)
                                    
                                    return (
                                        <div key={category.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-slate-200">
                                            <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600 border border-slate-100">
                                                        <Icon size={20} />
                                                    </div>
                                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">{category.label}</h3>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                                                    {catPerms.length} ACCESS POINTS
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {catPerms.map(perm => (
                                                        <div 
                                                            key={perm.id}
                                                            onClick={() => togglePermission(perm.id)}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border group",
                                                                activeRole.Permissions?.[perm.id] 
                                                                ? "bg-emerald-50/30 border-emerald-100 hover:border-emerald-200" 
                                                                : "bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100"
                                                            )}
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className={cn("font-black text-sm tracking-tight", activeRole.Permissions?.[perm.id] ? "text-emerald-900" : "text-slate-900")}>
                                                                    {perm.label}
                                                                </span>
                                                                <span className={cn("text-[10px] font-bold leading-tight italic", activeRole.Permissions?.[perm.id] ? "text-emerald-700/70" : "text-slate-600")}>
                                                                    {perm.desc}
                                                                </span>
                                                            </div>
                                                            <Switch 
                                                                checked={activeRole.Permissions?.[perm.id] || false}
                                                                onCheckedChange={() => togglePermission(perm.id)}
                                                                className="data-[state=checked]:bg-emerald-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
