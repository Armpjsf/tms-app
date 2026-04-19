"use client"

import { PremiumCard } from "@/components/ui/premium-card"
import { CheckCircle2, Layers, Truck, Building2, AlertTriangle } from "lucide-react"
import { LucideIcon } from "lucide-react"
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

const STATUS_STYLES = {
  good:     { dot: 'bg-emerald-500', badge: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/8', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]' },
  warning:  { dot: 'bg-amber-500',   badge: 'text-amber-400  border-amber-500/20  bg-amber-500/8',  glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
  critical: { dot: 'bg-rose-500',    badge: 'text-rose-400   border-rose-500/20   bg-rose-500/8',   glow: 'shadow-[0_0_12px_rgba(244,63,94,0.15)]'  },
}

const BORDER_MAP: Record<string, string> = {
  layers:   'border-l-primary',
  truck:    'border-l-blue-500',
  building: 'border-l-emerald-500',
}

const ICON_BG_MAP: Record<string, string> = {
  layers:   'bg-primary/15 border-primary/20 text-primary',
  truck:    'bg-blue-500/15 border-blue-500/20 text-blue-400',
  building: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
}

export function ExecutiveSectorHealth({ sectors }: { sectors: SectorHealth[] }) {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sectors.map((sector) => {
        const Icon = ICON_MAP[sector.icon] || Layers
        const isOptimal = sector.metrics.every(m => m.status === 'good')
        const hasCritical = sector.metrics.some(m => m.status === 'critical')

        const borderClass = BORDER_MAP[sector.icon] || 'border-l-muted'
        const iconBgClass = ICON_BG_MAP[sector.icon] || 'bg-muted/20 border-border/20 text-muted-foreground'

        return (
          <PremiumCard
            key={sector.title}
            className={cn(
              "relative overflow-hidden p-0 border border-border/10 border-l-[3px] bg-background/60 backdrop-blur-sm",
              "group hover:shadow-xl transition-shadow duration-500 flex flex-col",
              borderClass,
              hasCritical && "shadow-[0_0_20px_rgba(244,63,94,0.08)]"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border/5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "p-1.5 rounded-lg border shrink-0 group-hover:scale-110 transition-transform duration-300",
                  iconBgClass
                )}>
                  <Icon size={13} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-black text-foreground uppercase truncate leading-tight">{sector.title}</h4>
                  <p className="text-[8px] text-muted-foreground uppercase opacity-50 tracking-widest">CLUSTER</p>
                </div>
              </div>

              {/* Status Badge */}
              {isOptimal ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <CheckCircle2 size={8} strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase">Optimal</span>
                </div>
              ) : hasCritical ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0 animate-pulse">
                  <AlertTriangle size={8} strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase">Alert</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase">Attention</span>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="p-4 flex-1 space-y-2.5 relative z-10">
              {sector.metrics.map((m) => {
                const s = STATUS_STYLES[m.status]
                return (
                  <div
                    key={m.label}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border",
                      "bg-muted/20 border-border/5",
                      "group-hover:bg-muted/30 transition-colors duration-300"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
                      <p className="text-[9px] font-black text-muted-foreground uppercase truncate leading-none tracking-wide">{m.label}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-base font-black text-foreground tracking-tight leading-none">{m.value}</span>
                      <span className={cn(
                        "text-[7px] font-black border px-1 py-0.5 rounded uppercase tracking-tight",
                        s.badge
                      )}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

          </PremiumCard>
        )
      })}
    </div>
  )
}
