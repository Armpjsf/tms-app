"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  Settings, 
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  LogOut,
  ChevronRight,
  Building,
  Loader2,
  Cpu,
  Fingerprint,
  Zap,
  Activity
} from "lucide-react"
import { getUserProfile, UserProfile } from "@/lib/supabase/users"
import { PremiumButton } from "@/components/ui/premium-button"
import { PremiumCard } from "@/components/ui/premium-card"

const settingsSections = [
  {
    title: "User Profile Node",
    icon: User,
    items: [
      { label: "Identity Matrix", desc: "Profile data, credentials, visual ID", path: "/settings/profile" },
      { label: "Security Protocol", desc: "Access tokens & key rotation", path: "/settings/security" },
    ]
  },
  {
    title: "Organizational Logic",
    icon: Building,
    items: [
        { label: "Entity Profile", desc: "Logo, logistics metadata, tax registry", path: "/settings/company" },
        { label: "Access Control (RBAC)", desc: "Define clearance & permissions", path: "/settings/roles" },
        { label: "Operator Registry", desc: "Manage mission staff & drivers", path: "/settings/users" },
        { label: "Regional Nodes", desc: "Branch configuration & SMTP nodes", path: "/settings/branches" },
        { label: "Partner Network", desc: "Subcontractor & Central Bank nodes", path: "/settings/subcontractors" },
        { label: "Asset Classes", desc: "4W, 6W, Heavy Vector configuration", path: "/settings/vehicle-types" },
    ]
  },
  {
    title: "Signal Routing",
    icon: Bell,
    items: [
      { label: "Alert Configuration", desc: "Push, SMTP, SOS signal routing", path: "/settings/notifications" },
    ]
  },
  {
    title: "External Integration",
    icon: Database,
    items: [
      { label: "Financial Sync", desc: "Akaunting ledger connectivity status", path: "/settings/accounting" },
    ]
  },
  {
    title: "Interface Core",
    icon: Palette,
    items: [
      { label: "Visual Aesthetics", desc: "Theme engine, font scaling, HUD style", path: "/settings/theme" },
    ]
  },
  {
    title: "System Integrity",
    icon: Shield,
    items: [
      { label: "Authentication Vault", desc: "2FA, multi-node login verification", path: "/settings/security" },
    ]
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadProfile() {
      const data = await getUserProfile()
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Tactical Settings Header */}
      <div className="bg-[#0a0518] p-12 rounded-br-[6rem] rounded-tl-[3rem] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-6 mb-4">
               <div className="p-4 bg-primary/20 rounded-[2rem] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,30,133,0.2)] text-primary">
                  <Settings size={40} strokeWidth={2.5} />
               </div>
               <div>
                  <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none mb-2">Config Terminal</h1>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] opacity-80 italic italic">System Parameter & Account Management Matrix</p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-3xl">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Auth Level</span>
                <span className="text-xs font-black text-primary uppercase tracking-tighter">SECURE_ADMIN_V2</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/30">
                <Fingerprint size={24} />
             </div>
          </div>
        </div>
      </div>

      {/* Operator Signature Plate */}
      <PremiumCard className="bg-[#0a0518] border-2 border-white/5 shadow-3xl p-0 overflow-hidden rounded-br-[4rem] rounded-tl-[2rem]">
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
                    <div className="w-full h-full rounded-[2.3rem] bg-[#0a0518] flex items-center justify-center text-white text-5xl font-black italic border-2 border-white/10 overflow-hidden relative">
                       <div className="absolute inset-0 bg-primary/5" />
                       {(profile?.First_Name || profile?.Username || "A").charAt(0)}
                    </div>
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0a0518] rounded-2xl border-2 border-primary flex items-center justify-center text-primary shadow-xl">
                    <Fingerprint size={20} />
                 </div>
              </div>
              
              <div className="flex-1 text-center lg:text-left space-y-6">
                 <div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-2">
                       <h2 className="text-4xl font-black text-white tracking-widest uppercase italic">
                         {profile ? `${profile.First_Name || ""} ${profile.Last_Name || ""}`.trim() || profile.Username : "OPERATOR_ALPHA"}
                       </h2>
                       <div className="px-4 py-1 bg-primary/10 rounded-full border-2 border-primary/30">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">IDENTIFIED</span>
                       </div>
                    </div>
                    <p className="text-slate-500 font-black tracking-[0.4em] text-xs uppercase leading-none opacity-80">{profile?.Email || "SECURE_CHANNEL_PENDING"}</p>
                 </div>

                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-10">
                    <div className="flex flex-col gap-2">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Access Level</span>
                       <span className="px-5 py-2 bg-white/5 rounded-2xl border border-white/10 text-xs font-black text-primary uppercase tracking-widest shadow-xl">{profile?.Role || "STAFF_OPERATOR"}</span>
                    </div>
                    <div className="w-px h-12 bg-white/5 hidden lg:block" />
                    <div className="flex flex-col gap-2">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Temporal ID</span>
                       <span className="text-sm font-black text-white uppercase italic tracking-tighter">@{profile?.Username || "node_unbound"}</span>
                    </div>
                 </div>
              </div>

              <PremiumButton 
                  className="h-16 px-10 rounded-2xl gap-3 shadow-[0_15px_30px_rgba(255,30,133,0.3)]"
                  onClick={() => handleNavigate("/settings/profile")}
              >
                  EDIT MATRIX
              </PremiumButton>
            </div>
          )}
        </div>
      </PremiumCard>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {settingsSections.map((section, sectionIndex) => {
            const filteredItems = section.items.filter(item => {
                if (item.path === '/settings/roles') {
                    return ['Super Admin', 'Admin'].includes(profile?.Role || '')
                }
                return true
            })

            if (filteredItems.length === 0) return null

            return (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: sectionIndex * 0.05 }}
          >
            <PremiumCard className="bg-[#0a0518] border-2 border-white/5 h-full hover:border-primary/50 transition-all duration-500 rounded-br-[4rem] rounded-tl-[2rem] shadow-3xl overflow-hidden group/section p-0">
              <div className="bg-black/40 border-b border-white/5 p-8 flex items-center justify-between">
                <h3 className="flex items-center gap-4 text-sm font-black text-white uppercase tracking-[0.4em]">
                  <div className="p-3 bg-white/5 rounded-2xl text-slate-400 group-hover/section:bg-primary group-hover/section:text-white transition-all duration-300">
                    <section.icon size={20} />
                  </div>
                  {section.title}
                </h3>
                <Activity size={18} className="text-slate-800 group-hover/section:text-primary transition-colors duration-500" />
              </div>
              <div className="p-4 space-y-2">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.03)' }}
                    className="flex items-center justify-between p-6 rounded-3xl cursor-pointer transition-all group/item border-2 border-transparent hover:border-white/5"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <div className="space-y-1">
                      <p className="font-black text-base tracking-widest text-white uppercase italic">{item.label}</p>
                      <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] group-hover/item:text-primary transition-colors">{item.desc}</p>
                    </div>
                    <div className="p-3 rounded-full bg-white/5 group-hover/item:bg-primary/20 transition-all">
                       <ChevronRight className="text-slate-500 group-hover/item:text-primary transition-colors" size={20} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </PremiumCard>
          </motion.div>
        )})}
      </div>

      {/* Quick Core Protocols */}
      <div className="mt-12">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.8em] mb-8 ml-8">Core Protocols</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PremiumCard 
              onClick={() => handleNavigate("/settings/backup")}
              className="group/action hover:border-primary/50 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center gap-4 bg-white/5 border-white/5"
            >
               <div className="p-5 bg-primary/10 rounded-[2rem] text-primary group-hover/action:scale-110 transition-transform">
                  <Database size={32} />
               </div>
               <span className="text-sm font-black text-white uppercase tracking-[0.4em]">Backup Node</span>
            </PremiumCard>

            <PremiumCard 
              onClick={() => handleNavigate("/settings/api")}
              className="group/action hover:border-emerald-500/50 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center gap-4 bg-white/5 border-white/5"
            >
               <div className="p-5 bg-emerald-500/10 rounded-[2rem] text-emerald-500 group-hover/action:scale-110 transition-transform">
                  <Globe size={32} />
               </div>
               <span className="text-sm font-black text-white uppercase tracking-[0.4em]">API Signal</span>
            </PremiumCard>

            <PremiumCard 
              onClick={() => window.location.href = "/api/auth/logout"}
              className="group/action hover:border-rose-500/50 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center gap-4 bg-white/5 border-white/5"
            >
               <div className="p-5 bg-rose-500/10 rounded-[2rem] text-rose-500 group-hover/action:scale-110 transition-transform">
                  <LogOut size={32} />
               </div>
               <span className="text-sm font-black text-white uppercase tracking-[0.4em]">Terminate</span>
            </PremiumCard>
        </div>
      </div>

      <div className="mt-20 py-10 border-t border-white/5 flex flex-col items-center opacity-30 group/version">
         <div className="flex items-center gap-4 mb-2">
            <Cpu size={16} className="text-slate-500 group-hover/version:text-primary transition-colors" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.6em]">LogisPro Terminal v3.2.0-STABLE</p>
         </div>
         <p className="text-[8px] font-black text-slate-600 tracking-widest">ENCRYPTED OPERATION // SECURE ENDPOINT</p>
      </div>
    </div>
  )
}
