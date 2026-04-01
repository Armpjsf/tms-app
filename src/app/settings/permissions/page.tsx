'use client'

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
    ShieldCheck, 
    ChevronRight, 
    LayoutDashboard,
    Truck,
    FileText,
    AlertTriangle,
    MessageSquare,
    Wrench,
    Fuel,
    BarChart3,
    Activity,
    Navigation,
    Users,
    Building,
    CalendarDays,
    Receipt,
    Wallet,
    History,
    CheckCircle2,
    Zap,
    Bot,
    Settings,
    Save,
    Loader2,
    RefreshCw,
    User,
    Database,
    Shield
} from "lucide-react"
import { PremiumCard } from "@/components/ui/premium-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getAllRolePermissions, saveRolePermissions } from "@/lib/actions/permission-actions"

const MODULE_GROUPS = [
  {
    title: "Ops Command",
    items: [
      { key: "navigation.dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Operations",
    items: [
      { key: "navigation.planning", label: "การวางแผนงาน", icon: CalendarDays },
      { key: "navigation.calendar", label: "ปฏิทินงาน", icon: CalendarDays },
      { key: "navigation.history", label: "ประวัติงาน", icon: History },
      { key: "navigation.monitoring", label: "ติดตามงาน Real-time", icon: Activity },
      { key: "navigation.pod", label: "ระบบ POD", icon: FileText },
      { key: "navigation.notifications", label: "การแจ้งเตือน", icon: AlertTriangle },
      { key: "navigation.chat", label: "แชท/สื่อสาร", icon: MessageSquare },
    ]
  },
  {
    title: "Asset Control",
    items: [
      { key: "navigation.routes", label: "จัดการเส้นทาง", icon: Navigation },
      { key: "navigation.drivers", label: "ข้อมูลคนขับ", icon: Users },
      { key: "navigation.driver_leaves", label: "จัดการการลา", icon: CalendarDays },
      { key: "navigation.customers", label: "ข้อมูลลูกค้า", icon: Building },
      { key: "navigation.fleet", label: "ยานพาหนะ", icon: Truck },
      { key: "navigation.checks", label: "ตรวจสภาพรถ", icon: CheckCircle2 },
      { key: "navigation.maintenance", label: "แจ้งซ่อม/บำรุง", icon: Wrench },
      { key: "navigation.fuel", label: "ข้อมูลน้ำมัน", icon: Fuel },
    ]
  },
  {
    title: "Intelligence",
    items: [
      { key: "navigation.analytics", label: "วิเคราะห์ข้อมูล", icon: BarChart3 },
      { key: "navigation.ai", label: "ระบบ AI", icon: Bot },
      { key: "navigation.reports", label: "รายงานต่างๆ", icon: BarChart3 },
    ]
  },
  {
    title: "Financial",
    items: [
      { key: "navigation.billing_customer", label: "Billing ลูกค้า", icon: Receipt },
      { key: "navigation.billing_automation", label: "ระบบ Billing อัตโนมัติ", icon: Zap },
      { key: "navigation.invoices", label: "จัดการ Invoice", icon: FileText },
      { key: "navigation.payouts", label: "ค่าเที่ยวคนขับ", icon: Wallet },
    ]
  },
  {
    title: "System Settings",
    items: [
      { key: "navigation.settings", label: "หน้าตั้งค่าหลัก", icon: Settings },
      { key: "settings.items.identity", label: "ตั้งค่าโปรไฟล์ส่วนตัว", icon: User },
      { key: "settings.items.company", label: "ข้อมูลบริษัท (นิติบุคคล)", icon: Building },
      { key: "settings.items.permissions", label: "จัดการสิทธิ์ (Module Access)", icon: ShieldCheck },
      { key: "settings.items.operators", label: "จัดการผู้ใช้งานระบบ", icon: Users },
      { key: "settings.items.branches", label: "จัดการสาขา/โหนด", icon: Navigation },
      { key: "settings.items.partners", label: "จัดการรถร่วม (Vendor)", icon: Truck },
      { key: "settings.items.vehicles", label: "ประเภทรถและข้อกำหนด", icon: Truck },
      { key: "settings.items.accounting", label: "เชื่อมต่อระบบบัญชี", icon: Database },
      { key: "settings.items.expense_types", label: "จัดการประเภทค่าใช้จ่าย", icon: Receipt },
      { key: "settings.items.vault", label: "ระบบสำรองข้อมูล & Security", icon: Shield },
    ]
  }
]

const ROLES = ["Admin", "Manager", "Operation", "Finance", "Customer", "Driver"]

export default function PermissionsPage() {
    const [selectedRole, setSelectedRole] = useState("Admin")
    const [permissions, setPermissions] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadPermissions()
    }, [])

    const loadPermissions = async () => {
        setLoading(true)
        try {
            const data = await getAllRolePermissions()
            const mapping: Record<string, string[]> = {}
            data.forEach((item: any) => {
                mapping[item.Role_Name] = item.Allowed_Menus
            })
            
            // Set default if empty for Admin
            if (!mapping["Admin"]) {
                mapping["Admin"] = MODULE_GROUPS.flatMap(g => g.items.map(i => i.key))
            }
            
            setPermissions(mapping)
        } catch (error) {
            toast.error("ไม่สามารถโหลดข้อมูลสิทธิ์ได้")
        } finally {
            setLoading(false)
        }
    }

    const handleTogglePermission = (key: string) => {
        setPermissions(prev => {
            const current = prev[selectedRole] || []
            const next = current.includes(key)
                ? current.filter(k => k !== key)
                : [...current, key]
            return { ...prev, [selectedRole]: next }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const allowedMenus = permissions[selectedRole] || []
            console.log("Saving permissions for:", selectedRole, allowedMenus)
            const result = await saveRolePermissions(selectedRole, allowedMenus)
            
            if (result.success) {
                toast.success(`บันทึกสิทธิ์สำหรับกลุ่ม ${selectedRole} เรียบร้อยแล้ว`)
            } else {
                console.error("Save failed result:", result)
                toast.error(`บันทึกไม่สำเร็จ: ${result.message || 'Unknown Error'}`, {
                    description: "รบกวนตรวจสอบ SUPABASE_SERVICE_ROLE_KEY ใน .env.local หรือติดต่อผู้ดูแลระบบ"
                })
            }
        } catch (error: any) {
            console.error("Save catch error:", error)
            toast.error("เกิดข้อผิดพลาดในการบันทึก", {
                description: error.message || "Unknown error"
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em]">กำลังซิงค์ข้อมูลสิทธิ์...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-24 px-8">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] border shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck size={40} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">ตั้งค่าสิทธิ์ผู้ใช้งาน</h1>
                            <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-sm">การจัดการโมดูลตามกลุ่มพนักงาน</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline"
                            onClick={loadPermissions}
                            className="h-16 px-6 rounded-2xl border-2 font-black uppercase active:scale-95 transition-all"
                        >
                            <RefreshCw size={20} />
                        </Button>
                        <Button 
                            disabled={saving}
                            onClick={handleSave}
                            className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all gap-3"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            บันทึกสิทธิ์ {selectedRole}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    {/* Role Selection Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="px-4 text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">กลุ่มผู้ใช้งาน</h3>
                        {ROLES.map((role) => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={cn(
                                    "w-full h-16 px-6 rounded-2xl flex items-center justify-between font-black uppercase tracking-widest transition-all active:scale-95",
                                    selectedRole === role 
                                    ? "bg-foreground text-white shadow-2xl shadow-foreground/20 scale-[1.02]" 
                                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {role}
                                <ChevronRight size={18} className={cn("transition-transform", selectedRole === role ? "rotate-90" : "")} />
                            </button>
                        ))}
                    </div>

                    {/* Permissions Grid */}
                    <div className="lg:col-span-3 space-y-10">
                        {MODULE_GROUPS.map((group) => (
                            <div key={group.title} className="space-y-6">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="w-1.5 h-6 bg-accent rounded-full" />
                                    <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{group.title}</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {group.items.map((item) => {
                                        const isAllowed = (permissions[selectedRole] || []).includes(item.key)
                                        return (
                                            <div 
                                                key={item.key}
                                                onClick={() => handleTogglePermission(item.key)}
                                                className={cn(
                                                    "group p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between",
                                                    isAllowed 
                                                    ? "bg-white border-primary shadow-lg shadow-primary/5" 
                                                    : "bg-slate-100/50 border-transparent hover:border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                                        isAllowed ? "bg-primary text-white" : "bg-slate-200 text-slate-400 group-hover:bg-slate-300"
                                                    )}>
                                                        <item.icon size={22} />
                                                    </div>
                                                    <div>
                                                        <p className={cn(
                                                            "font-black text-lg leading-none transition-colors",
                                                            isAllowed ? "text-slate-900" : "text-slate-400"
                                                        )}>
                                                            {item.label}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.key.split('.')[1]}</p>
                                                    </div>
                                                </div>
                                                <Checkbox 
                                                    checked={isAllowed}
                                                    onCheckedChange={() => handleTogglePermission(item.key)}
                                                    className="w-6 h-6 rounded-lg data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
