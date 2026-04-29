"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PremiumCard } from "@/components/ui/premium-card"
import { PremiumButton } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Shield, 
    ArrowLeft, 
    Key, 
    Lock, 
    Smartphone, 
    Activity, 
    Zap, 
    ShieldCheck, 
    Target, 
    Loader2,
    Check,
    X as XIcon,
    Trash2,
    Globe,
    Monitor
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useLanguage } from "@/components/providers/language-provider"
import { getPendingIPs, approveIP, blockIP, deleteIPRecord, getCurrentUserSession, changePassword } from "@/lib/actions/security-actions"
import { Badge } from "@/components/ui/badge"
import { getUserProfile } from "@/lib/supabase/users"
import { getPermissionsByRole } from "@/lib/actions/permission-actions"

export default function SecuritySettingsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingIPs, setPendingIPs] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)
  const [ipLoading, setIpLoading] = useState(false)
  const [allowedMenus, setAllowedMenus] = useState<string[] | null>(null)
  const [isPermsLoaded, setIsPermsLoaded] = useState(false)

  useEffect(() => {
    async function init() {
        const sess = await getCurrentUserSession()
        setSession(sess)
        
        // Fetch permissions
        const profile = await getUserProfile()
        if (profile?.Role) {
            const perms = await getPermissionsByRole(profile.Role)
            setAllowedMenus(perms)
        }
        setIsPermsLoaded(true)

        if (sess && (sess.roleId === 1 || sess.roleId === 2)) {
            const ips = await getPendingIPs()
            setPendingIPs(ips)
        }
    }
    init()
  }, [])

  const refreshIPs = async () => {
    const ips = await getPendingIPs()
    setPendingIPs(ips)
  }

  const handleApproveIP = async (id: string, username: string, ip: string) => {
    setIpLoading(true)
    const res = await approveIP(id, username, ip)
    if (res.success) {
        toast.success(`Approved IP ${ip} for ${username}`)
        refreshIPs()
    } else {
        toast.error(res.error)
    }
    setIpLoading(false)
  }

  const handleBlockIP = async (id: string, username: string, ip: string) => {
    setIpLoading(true)
    const res = await blockIP(id, username, ip)
    if (res.success) {
        toast.success(`Blocked IP ${ip}`)
        refreshIPs()
    } else {
        toast.error(res.error)
    }
    setIpLoading(false)
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.warning('กรุณากรอกรหัสผ่านปัจจุบัน')
      return
    }
    if (!password) {
        toast.warning('กรุณากรอกรหัสผ่านใหม่')
        return
    }
    if (password !== confirmPassword) {
      toast.warning(t('security.toasts.match_error'))
      return
    }
    if (password.length < 6) {
      toast.warning(t('security.toasts.length_error'))
      return
    }

    setLoading(true)
    try {
        const result = await changePassword(currentPassword, password)
        if (result.success) {
            toast.success('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')
            setCurrentPassword("")
            setPassword("")
            setConfirmPassword("")
        } else {
            toast.error(result.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้')
        }
    } catch (e) {
        toast.error('เกิดข้อผิดพลาด: ' + (e as Error).message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-20 p-4 lg:p-10 max-w-6xl mx-auto">
        {/* Tactical Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-background/60 backdrop-blur-3xl p-10 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.1em] text-base font-bold group/back italic">
                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                    {t('common.back')}
                </button>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-[2.5rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary group-hover:scale-110 transition-all duration-500">
                        <Shield size={42} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none italic premium-text-gradient">
                            {!allowedMenus || allowedMenus.includes('settings.items.vault') || allowedMenus.includes('settings.items.security') 
                                ? t('settings.items.security') 
                                : t('settings.items.change_password')}
                        </h1>
                        <p className="text-base font-bold font-black text-primary uppercase tracking-[0.2em] mt-2 opacity-80 italic">
                            {!allowedMenus || allowedMenus.includes('settings.items.vault') || allowedMenus.includes('settings.items.security') 
                                ? t('settings.items.security_desc') 
                                : t('settings.items.change_password_desc')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-6 relative z-10">
                <div className="bg-muted/50 border border-border/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                    <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest italic">{t('security.defense_status')}</span>
                </div>
                <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                   <ShieldCheck className="text-primary" size={18} />
                   <span className="text-base font-bold font-black text-foreground uppercase tracking-[0.1em] italic">{t('security.encryption_label')}</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
             {/* Key Rotation Matrix */}
             <div className="lg:col-span-12">
                  <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/security">
                      <div className="p-20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] pointer-events-none" />
                          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                          
                          <div className="max-w-xl mx-auto space-y-12 relative z-10">
                              <div className="flex flex-col items-center text-center space-y-6 mb-16">
                                   <div className="w-24 h-24 rounded-[2rem] bg-primary/20 flex items-center justify-center text-primary border-2 border-primary/30 shadow-[0_0_50px_rgba(255,30,133,0.3)] group-hover/security:rotate-12 transition-transform duration-700">
                                        <Key size={40} strokeWidth={2.5} />
                                   </div>
                                   <div className="space-y-2">
                                        <h2 className="text-4xl font-black text-foreground tracking-[0.2em] uppercase italic">{t('security.key_rotation_title')}</h2>
                                        <p className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.2em] italic">{t('security.key_rotation_desc')}</p>
                                   </div>
                              </div>

                              <div className="space-y-10">
                                  <div className="space-y-4">
                                      <Label className="text-base font-bold font-black uppercase text-muted-foreground/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                          <Lock size={12} /> รหัสผ่านปัจจุบัน
                                      </Label>
                                      <Input 
                                          type="password" 
                                          value={currentPassword}
                                          onChange={(e) => setCurrentPassword(e.target.value)}
                                          className="h-16 bg-black/60 border-border/5 rounded-[1.5rem] focus:border-amber-500/50 transition-all text-foreground font-black italic tracking-widest pl-8 shadow-inner"
                                          placeholder="••••••••••••"
                                      />
                                  </div>
                                  <div className="space-y-4">
                                      <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                          <Lock size={12} /> {t('security.new_key_label')}
                                      </Label>
                                      <Input 
                                          type="password" 
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          className="h-16 bg-black/60 border-border/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-foreground font-black italic tracking-widest pl-8 shadow-inner"
                                          placeholder="••••••••••••"
                                      />
                                  </div>
                                  <div className="space-y-4">
                                      <Label className="text-base font-bold font-black uppercase text-primary/60 tracking-[0.1em] ml-6 flex items-center gap-2">
                                          <Shield size={12} /> {t('security.verify_key_label')}
                                      </Label>
                                      <Input 
                                          type="password" 
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          className="h-16 bg-black/60 border-border/5 rounded-[1.5rem] focus:border-primary/50 transition-all text-foreground font-black italic tracking-widest pl-8 shadow-inner"
                                          placeholder="••••••••••••"
                                      />
                                  </div>
                                  
                                  <div className="pt-10">
                                    <PremiumButton 
                                        onClick={handleUpdatePassword} 
                                        disabled={loading} 
                                        className="w-full h-20 rounded-[2rem] bg-primary text-foreground font-black italic tracking-[0.2em] shadow-[0_30px_60px_rgba(255,30,133,0.3)] border-0 text-lg gap-6 group/save"
                                    >
                                      {loading ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} className="group-hover/save:scale-125 transition-transform" />}
                                      {loading ? t('security.updating_indicator') : t('security.save_button')}
                                    </PremiumButton>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </PremiumCard>
             </div>

             {/* IP Approval Matrix - ONLY FOR ADMINS */}
             {(session?.roleId === 1 || session?.roleId === 2) && (
              <div className="lg:col-span-12">
                   <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/ip">
                       <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
                           <div className="space-y-1">
                               <h3 className="text-xl font-black text-foreground tracking-widest uppercase italic flex items-center gap-3">
                                   <Globe size={20} className="text-primary" />
                                   คำขออนุมัติ IP / อุปกรณ์ใหม่
                               </h3>
                               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest italic ml-8">
                                   จัดการการเข้าถึงระบบจากอุปกรณ์ที่ไม่รู้จัก
                               </p>
                           </div>
                           <Badge variant="outline" className="px-4 py-1.5 border-primary/20 text-primary bg-primary/5 font-black uppercase italic tracking-widest">
                                 {pendingIPs.length} PENDING
                           </Badge>
                       </div>
                       
                       <div className="p-0">
                           {pendingIPs.length === 0 ? (
                               <div className="p-20 text-center space-y-6">
                                   <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted-foreground border border-border/10">
                                        <Shield size={32} className="opacity-30" />
                                   </div>
                                   <p className="text-xl font-black text-muted-foreground uppercase tracking-[0.2em] italic">ไม่พบคำขอที่ค้างอยู่</p>
                               </div>
                           ) : (
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left border-collapse">
                                       <thead>
                                           <tr className="border-b border-border/5 bg-muted/10">
                                               <th className="px-8 py-6 text-base font-bold font-black text-primary uppercase tracking-widest italic">USER / IDENTITY</th>
                                               <th className="px-8 py-6 text-base font-bold font-black text-primary uppercase tracking-widest italic">IP ADDRESS</th>
                                               <th className="px-8 py-6 text-base font-bold font-black text-primary uppercase tracking-widest italic">DEVICE INFO</th>
                                               <th className="px-8 py-6 text-base font-bold font-black text-primary uppercase tracking-widest italic text-right">ACTIONS</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-border/5">
                                           {pendingIPs.map((req) => (
                                               <tr key={req.id} className="hover:bg-primary/5 transition-colors group/row">
                                                   <td className="px-8 py-6">
                                                       <div className="flex items-center gap-4">
                                                           <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-foreground font-black italic border border-border/10 group-hover/row:bg-primary/20 group-hover/row:text-primary transition-all">
                                                               {req.username.charAt(0).toUpperCase()}
                                                           </div>
                                                           <div className="flex flex-col">
                                                               <span className="text-lg font-black text-foreground uppercase tracking-tight italic">{req.username}</span>
                                                               <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest text-[10px] italic">
                                                                   ร้องขอเมื่อ: {new Date(req.created_at).toLocaleString('th-TH')}
                                                               </span>
                                                           </div>
                                                       </div>
                                                   </td>
                                                   <td className="px-8 py-6 font-mono text-primary font-black italic tracking-widest text-lg">
                                                       {req.ip_address}
                                                   </td>
                                                   <td className="px-8 py-6">
                                                       <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold uppercase tracking-wider italic">
                                                           <Monitor size={14} />
                                                           <span className="truncate max-w-[200px]">{req.device_info || 'Unknown Device'}</span>
                                                       </div>
                                                   </td>
                                                   <td className="px-8 py-6 text-right">
                                                       <div className="flex items-center justify-end gap-3">
                                                           <button 
                                                               onClick={() => handleApproveIP(req.id, req.username, req.ip_address)}
                                                               disabled={ipLoading}
                                                               className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5 disabled:opacity-50"
                                                               title="Approve Access"
                                                           >
                                                               <Check size={20} strokeWidth={3} />
                                                           </button>
                                                           <button 
                                                               onClick={() => handleBlockIP(req.id, req.username, req.ip_address)}
                                                               disabled={ipLoading}
                                                               className="p-3 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-lg shadow-amber-500/5 disabled:opacity-50"
                                                               title="Block IP"
                                                           >
                                                               <XIcon size={20} strokeWidth={3} />
                                                           </button>
                                                           <button 
                                                               onClick={async () => {
                                                                    if (confirm('ยืนยันการลบข้อมูล?')) {
                                                                        const res = await deleteIPRecord(req.id)
                                                                        if (res.success) {
                                                                            toast.success('Deleted record')
                                                                            refreshIPs()
                                                                        }
                                                                    }
                                                               }}
                                                               disabled={ipLoading}
                                                               className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 disabled:opacity-50"
                                                               title="Delete Record"
                                                           >
                                                               <Trash2 size={20} />
                                                           </button>
                                                       </div>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           )}
                       </div>
                   </PremiumCard>
              </div>
              )}

             {/* 2FA Matrix - ONLY IF HAS FULL SECURITY PERMS */}
             {(!allowedMenus || allowedMenus.includes('settings.items.vault') || allowedMenus.includes('settings.items.security')) && (
              <div className="lg:col-span-12">
                   <PremiumCard className="bg-background/40 border-2 border-border/5 shadow-3xl rounded-[4rem] overflow-hidden group/2fa">
                       <div className="p-10 border-b border-border/5 bg-black/40 flex items-center justify-between">
                           <h3 className="text-xl font-black text-foreground tracking-widest uppercase italic flex items-center gap-3">
                               <Smartphone size={20} className="text-indigo-400" />
                               {t('security.mfa_title')}
                           </h3>
                           <div className="px-5 py-1.5 rounded-xl bg-indigo-500/10 text-base font-bold font-black text-indigo-400 uppercase tracking-[0.1em] border border-indigo-500/20 italic">
                               {t('security.mfa_status')}
                           </div>
                       </div>
                       <div className="p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                           <div className="space-y-4 text-center md:text-left">
                               <p className="text-xl font-black text-foreground uppercase tracking-widest italic">{t('security.mfa_desc_title')}</p>
                               <p className="text-base font-bold font-black text-muted-foreground leading-relaxed uppercase tracking-[0.2em] italic">
                                   {t('security.mfa_desc')}
                               </p>
                           </div>
                           <PremiumButton variant="outline" disabled className="h-16 px-10 rounded-2xl border-border/10 text-muted-foreground gap-3 uppercase font-black text-base font-bold tracking-[0.1em] cursor-not-allowed italic">
                               {t('security.system_lock')}
                           </PremiumButton>
                       </div>
                   </PremiumCard>
              </div>
             )}
        </div>

        {/* Global Advisory */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-primary/5 border-2 border-primary/10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-[2rem] bg-primary/20 text-primary border-2 border-primary/30 shadow-2xl animate-pulse">
                <Target size={32} />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
                <p className="text-xl font-black text-primary italic uppercase tracking-widest">{t('security.advisory_title')}</p>
                <p className="text-xl font-bold text-muted-foreground leading-relaxed uppercase tracking-wider italic">
                    {t('security.advisory_desc')}
                </p>
            </div>
            <PremiumButton variant="outline" className="h-14 px-10 rounded-2xl border-border/10 text-foreground gap-3 uppercase font-black text-base font-bold tracking-[0.1em] ml-auto italic">
                <Activity size={18} /> {t('security.view_logs')}
            </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  )
}
