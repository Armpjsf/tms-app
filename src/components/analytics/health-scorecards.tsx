"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { LucideIcon, CheckCircle2, ChevronRight, Layers, Truck, Building2, Activity } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

const ICON_MAP: Record<string, LucideIcon> = {
  layers: Layers,
  truck: Truck,
  building: Building2,
}

type HealthMetric = {
  label: string
  value: string | number
  status: 'good' | 'warning' | 'critical'
}

type SectorHealth = {
  title: string
  icon: string
  href: string
  metrics: HealthMetric[]
}

export function ExecutiveSectorHealth({ sectors }: { sectors: SectorHealth[] }) {
  const { t } = useLanguage()
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-emerald-500'
      case 'warning': return 'bg-amber-500'
      case 'critical': return 'bg-rose-500'
      default: return 'bg-slate-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
      case 'warning': return 'text-amber-400 border-amber-500/20 bg-amber-500/5'
      case 'critical': return 'text-rose-400 border-rose-500/20 bg-rose-500/5'
      default: return 'text-muted-foreground border-slate-500/20 bg-slate-500/5'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {sectors.map((sector) => {
        const Icon = ICON_MAP[sector.icon] || Layers
        const isOptimal = sector.metrics.every(m => m.status === 'good')
        
        return (
          <PremiumCard key={sector.title} className="bg-background border-none shadow-2xl relative overflow-hidden group p-0 rounded-br-[4rem] rounded-tl-[2rem]">
            {/* Dynamic context glow */}
            <div className={cn(
                "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-700",
                isOptimal ? "bg-emerald-500/30" : "bg-amber-500/30"
            )} />
            
            <div className="p-8 border-b border-border/5 relative overflow-hidden flex items-center justify-between">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-2.5 bg-muted/50 rounded-xl text-foreground border border-border/10 group-hover:border-border/20 transition-all">
                        <Icon size={20} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold font-black text-foreground uppercase italic leading-none">{sector.title}</h4>
                        <p className="text-base font-bold text-muted-foreground font-bold uppercase mt-1">{t('dashboard.sector_integrity')}</p>
                    </div>
                </div>
                <div className="relative z-10">
                    {isOptimal ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-base font-bold uppercase tracking-tighter italic">
                            <CheckCircle2 size={10} strokeWidth={3} /> {t('dashboard.status_optimal')}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-base font-bold uppercase tracking-tighter italic animate-pulse">
                            <Activity size={10} strokeWidth={3} /> {t('dashboard.status_attention')}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 gap-4 mb-8">
                {sector.metrics.map((m) => (
                  <div key={m.label} className="p-5 bg-muted/50 rounded-2xl border border-border/5 group-hover:border-border/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-base font-bold text-muted-foreground font-black uppercase leading-none">{m.label}</p>
                        <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", getStatusColor(m.status))} />
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-3xl font-black text-foreground tracking-tighter italic leading-none">{m.value}</span>
                       <span className={cn("text-base font-bold font-black border px-2 py-0.5 rounded-lg uppercase tracking-tighter italic", getStatusText(m.status))}>
                          {m.status.toUpperCase()}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link href={sector.href} className="block group/link">
                <button className="w-full h-12 rounded-2xl bg-card border border-slate-800 text-foreground font-black text-base font-bold uppercase italic flex items-center justify-between px-6 group-hover/link:bg-white group-hover/link:text-black transition-all duration-500 overflow-hidden relative">
                    <span className="relative z-10">{t('dashboard.access_sector')}</span>
                    <ChevronRight size={14} className="relative z-10 group-hover/link:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </PremiumCard>
        )})}
    </div>
  )
}

