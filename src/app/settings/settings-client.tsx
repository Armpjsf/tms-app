"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  Settings as SettingsIcon, 
  User,
  Bell,
  Shield,
  Palette,
  Database,
  LogOut,
  ChevronRight,
  Building,
  Loader2,
  Cpu,
  Fingerprint,
  Activity,
  Globe,
  Users,
  Navigation,
  Truck,
  Receipt,
  Zap,
  ArrowLeft
} from "lucide-react"
import { getUserProfile, UserProfile } from "@/lib/supabase/users"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"
import { useLanguage } from "@/components/providers/language-provider"
import { getPermissionsByRole } from "@/lib/actions/permission-actions"
import Link from "next/link"

const settingsSections = [
  {
    titleKey: "settings.sections.profile",
    icon: User,
    items: [
      { labelKey: "settings.items.identity", descKey: "settings.items.identity_desc", path: "/settings/profile", permKey: "settings.items.identity" },
      { labelKey: "settings.items.security", descKey: "settings.items.security_desc", path: "/settings/security", permKey: "settings.items.security" },
      { labelKey: "settings.items.change_password", descKey: "settings.items.change_password_desc", path: "/settings/security", permKey: "settings.items.change_password" },
    ]
  },
  {
    titleKey: "settings.sections.org",
    icon: Building,
    items: [
        { labelKey: "settings.items.company", descKey: "settings.items.company_desc", path: "/settings/company", permKey: "settings.items.company" },
        { labelKey: "settings.items.accounting_profile", descKey: "settings.items.accounting_profile_desc", path: "/settings/accounting-profile", permKey: "settings.items.accounting_profile" },
        { labelKey: "settings.items.customers", descKey: "settings.items.customers_desc", path: "/settings/customers", permKey: "settings.items.customers" },
        { labelKey: "settings.items.permissions", descKey: "settings.items.permissions_desc", path: "/settings/permissions", permKey: "settings.items.permissions" },
        { labelKey: "settings.items.operators", descKey: "settings.items.operators_desc", path: "/settings/users", permKey: "settings.items.operators" },
        { labelKey: "settings.items.branches", descKey: "settings.items.branches_desc", path: "/settings/branches", permKey: "settings.items.branches" },
        { labelKey: "settings.items.partners", descKey: "settings.items.partners_desc", path: "/settings/subcontractors", permKey: "settings.items.partners" },
        { labelKey: "settings.items.vehicles", descKey: "settings.items.vehicles_desc", path: "/settings/vehicle-types", permKey: "settings.items.vehicles" },
        { labelKey: "settings.items.fleet_standards", descKey: "settings.items.fleet_standards_desc", path: "/settings/fleet-standards", permKey: "settings.items.fleet_standards" },
    ]
  },
  {
    titleKey: "settings.sections.alerts",
    icon: Bell,
    items: [
      { labelKey: "settings.items.alerts_config", descKey: "settings.items.alerts_config_desc", path: "/settings/notifications", permKey: "settings.items.notifications" },
    ]
  },
  {
    titleKey: "settings.sections.integrations",
    icon: Database,
    items: [
      { labelKey: "settings.items.accounting", descKey: "settings.items.accounting_desc", path: "/settings/accounting", permKey: "settings.items.accounting" },
      { labelKey: "settings.items.expense_types", descKey: "settings.items.expense_types_desc", path: "/settings/expense-types", permKey: "settings.items.expense_types" },
    ]
  },
  {
    titleKey: "settings.sections.interface",
    icon: Palette,
    items: [
      { labelKey: "settings.items.theme", descKey: "settings.items.theme_desc", path: "/settings/theme", permKey: "settings.items.theme" },
    ]
  },
  {
    titleKey: "settings.sections.security",
    icon: Shield,
    items: [
      { labelKey: "settings.items.vault", descKey: "settings.items.vault_desc", path: "/settings/backup", permKey: "settings.items.vault" },
    ]
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [allowedMenus, setAllowedMenus] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadData() {
      const userData = await getUserProfile()
      setProfile(userData)
      
      if (userData?.Role) {
          const perms = await getPermissionsByRole(userData.Role)
          setAllowedMenus(perms)
      }
      
      setLoading(false)
    }
    loadData()
  }, [])

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  // Filter sections and items based on permissions
  const filteredSections = settingsSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
          if (!allowedMenus) return true // Default to show (e.g. for Admin if perms not set)
          return allowedMenus.includes(item.permKey || "") || allowedMenus.includes(item.labelKey)
      })
  })).filter(section => section.items.length > 0)

  return (
    <div className="space-y-12 pb-20">
      {/* Tactical Settings Header */}
      <div className="bg-background p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-border/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all font-black uppercase tracking-[0.4em] text-sm font-bold group/back italic mb-6">
                <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" /> 
                COMMAND_CENTRE
            </Link>
            <div className="flex items-center gap-6 mb-4">
               <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                  <SettingsIcon size={40} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-foreground tracking-widest uppercase leading-none mb-2">{t('settings.title')}</h1>
                  <p className="text-base font-bold font-black text-primary uppercase tracking-[0.6em] opacity-80 italic">{t('settings.subtitle')}</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-3xl border border-border/5 backdrop-blur-3xl">
             <div className="flex flex-col items-end">
                <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest">{t('settings.auth_level')}</span>
                <span className="text-lg font-bold font-black text-primary uppercase tracking-tighter">SECURE_ADMIN_V2</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/30">
                <Fingerprint size={24} />
             </div>
          </div>
        </div>
      </div>

      {/* Operator Signature Plate */}
      <PremiumCard className="bg-background border-2 border-border/5 shadow-3xl p-0 overflow-hidden rounded-br-[4rem] rounded-tl-[2rem]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="p-10 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-10">
               <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="relative group">
                 <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-purple-600 p-1 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                    <div className="w-full h-full rounded-[2.3rem] bg-background flex items-center justify-center text-foreground text-5xl font-black italic border-2 border-border/10 overflow-hidden relative">
                       <div className="absolute inset-0 bg-primary/5" />
                       {(profile?.First_Name || profile?.Username || "A").charAt(0)}
                    </div>
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-background rounded-2xl border-2 border-primary flex items-center justify-center text-primary shadow-xl">
                    <Fingerprint size={20} />
                 </div>
              </div>
              
              <div className="flex-1 text-center lg:text-left space-y-6">
                 <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-2">
                       <h2 className="text-4xl font-black text-foreground tracking-widest uppercase italic">
                         {profile ? `${profile.First_Name || ""} ${profile.Last_Name || ""}`.trim() || profile.Username : "OPERATOR_ALPHA"}
                       </h2>
                       <div className="px-4 py-1 bg-primary/10 rounded-full border-2 border-primary/30">
                          <span className="text-base font-bold font-black text-primary uppercase tracking-[0.2em]">{t('settings.identified')}</span>
                       </div>
                    </div>
                    <p className="text-muted-foreground font-black tracking-[0.4em] text-lg font-bold uppercase leading-none opacity-80">{profile?.Email || t('settings.secure_pending')}</p>
                 </div>

                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-10">
                    <div className="flex flex-col gap-2">
                       <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none">{t('settings.auth_level')}</span>
                       <span className="px-5 py-2 bg-muted/50 rounded-2xl border border-border/10 text-lg font-bold font-black text-primary uppercase tracking-widest shadow-xl">{t(`settings.roles_list.${profile?.Role}` as any) || profile?.Role || "STAFF_OPERATOR"}</span>
                    </div>
                    <div className="w-px h-12 bg-muted/50 hidden lg:block" />
                    <div className="flex flex-col gap-2">
                       <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-widest leading-none">{t('settings.temporal_id')}</span>
                       <span className="text-xl font-black text-foreground uppercase italic tracking-tighter">@{profile?.Username || "node_unbound"}</span>
                    </div>
                 </div>
              </div>

              <PremiumButton 
                  className="h-16 px-10 rounded-2xl gap-3 shadow-[0_15px_30px_rgba(255,30,133,0.3)]"
                  onClick={() => handleNavigate("/settings/profile")}
              >
                  {t('settings.edit_matrix')}
              </PremiumButton>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {filteredSections.map((section, sectionIndex) => (
          <motion.div
            key={section.titleKey}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: sectionIndex * 0.05 }}
          >
            <PremiumCard className="bg-background border-2 border-border/5 h-full hover:border-primary/50 transition-all duration-500 rounded-br-[4rem] rounded-tl-[2rem] shadow-3xl overflow-hidden group/section p-0">
              <div className="bg-black/40 border-b border-border/5 p-8 flex items-center justify-between">
                <h3 className="flex items-center gap-4 text-xl font-black text-foreground uppercase tracking-[0.4em]">
                  <div className="p-3 bg-muted/50 rounded-2xl text-muted-foreground group-hover/section:bg-primary group-hover/section:text-foreground transition-all duration-300">
                    <section.icon size={20} />
                  </div>
                  {t(section.titleKey)}
                </h3>
                    <div className="flex items-center gap-3">
                        <Activity className="text-muted-foreground group-hover/section:text-primary transition-colors duration-500" size={16} />
                        <span className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.1em]">{t('settings.auth_level')}</span>
                    </div>
                 </div>
                 <div className="p-4 space-y-2">
                   {section.items.map((item) => (
                     <motion.div
                       key={item.labelKey}
                       whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.03)' }}
                       className="flex items-center justify-between p-6 rounded-3xl cursor-pointer transition-all group/item border-2 border-transparent hover:border-border/5"
                       onClick={() => handleNavigate(item.path)}
                     >
                       <div className="space-y-1">
                         <p className="font-black text-base tracking-widest text-foreground uppercase italic">{t(item.labelKey)}</p>
                         <p className="text-base font-bold uppercase font-black text-muted-foreground tracking-[0.1em] group-hover/item:text-primary transition-colors">{t(item.descKey)}</p>
                       </div>
                       <div className="p-3 rounded-full bg-muted/50 group-hover/item:bg-primary/20 transition-all">
                          <ChevronRight className="text-muted-foreground group-hover/item:text-primary transition-colors" size={20} />
                       </div>
                     </motion.div>
                   ))}
                 </div>
               </PremiumCard>
             </motion.div>
           ))}
         </div>
   
         {/* Quick Core Protocols */}
         <div className="mt-12">
           <h3 className="text-base font-bold font-black text-muted-foreground uppercase tracking-[0.4em] mb-8 ml-8">{t('settings.core_protocols')}</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <PremiumCard 
                 onClick={() => handleNavigate("/settings/backup")}
                 className="group/action hover:border-primary/50 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center gap-4 bg-muted/50 border-border/5"
               >
                  <div className="p-5 bg-primary/10 rounded-[2rem] text-primary group-hover/action:scale-110 transition-transform">
                     <Database size={32} />
                  </div>
                  <span className="text-xl font-black text-foreground uppercase tracking-[0.2em]">{t('settings.backup_node')}</span>
               </PremiumCard>
   
               <PremiumCard 
                 onClick={() => handleNavigate("/settings/api")}
                 className="group/action hover:border-emerald-500/50 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center gap-4 bg-muted/50 border-border/5"
               >
                  <div className="p-5 bg-emerald-500/10 rounded-[2rem] text-emerald-500 group-hover/action:scale-110 transition-transform">
                     <Globe size={32} />
                  </div>
                  <span className="text-xl font-black text-foreground uppercase tracking-[0.2em]">{t('settings.api_signal')}</span>
               </PremiumCard>
   
               <PremiumCard 
                 onClick={() => window.location.href = "/api/auth/logout"}
                 className="group/action hover:border-rose-500/50 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center gap-4 bg-muted/50 border-border/5"
               >
                  <div className="p-5 bg-rose-500/10 rounded-[2rem] text-rose-500 group-hover/action:scale-110 transition-transform">
                     <LogOut size={32} />
                  </div>
                  <span className="text-xl font-black text-foreground uppercase tracking-[0.2em]">{t('settings.terminate')}</span>
               </PremiumCard>
           </div>
         </div>
   
         <div className="mt-20 py-10 border-t border-border/5 flex flex-col items-center opacity-30 group/version">
            <div className="flex items-center gap-4 mb-2">
               <Cpu size={16} className="text-muted-foreground group-hover/version:text-primary transition-colors" />
               <p className="text-base font-bold font-black text-foreground uppercase tracking-[0.4em]">{t('settings.terminal_version')}</p>
            </div>
            <p className="text-base font-bold font-black text-muted-foreground tracking-widest">{t('settings.encrypted_op')}</p>
         </div>
    </div>
  )
}
